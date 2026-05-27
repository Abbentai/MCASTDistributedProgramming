const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const { getFirestore } = require('firebase-admin/firestore');
const { accountExists } = require('./account.js');
require('dotenv').config();

//Error codes in case you need them
//https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
const { db, appEmitter } = require('./server.js');

//Consts for price calculation
const CAB_MULTIPLIERS = {
    economic: 1.0,
    premium: 1.2,
    executive: 1.4,
};

const DAYTIME_MULTIPLIERS = {
    //Between 8:00 AM and 11:59 PM: 1
    standard: 1.0,
    // Between 12:00 AM and 8:00 AM: 1.2
    night: 1.2,
};

const DEFAULT_DISCOUNT = 1.0;
const LOYALTY_DISCOUNT = 0.9;


//This bascially checks if the script is being ran directtly from node or being imported as a module, this is for function exports 
if (require.main === module) {
    //Initalisation code
    const app = express();
    app.use(express.json());

    app.get('/api/payment', (req, res) => {
        res.send('Payment service is running');
        console.log("request sent for /api/payment");
    });


    app.get('/api/payment/calculateprice/:bookingId', async (req, res) => {
        try {
            //Retrieve booking details from firestore
            const { bookingId } = req.params;

            //Validation for bookingId presence and if booking is already paid for
            if (!bookingId) {
                return res.status(400).json({ error: 'Booking ID is required!' });
            }

            const bookingDoc = await db.collection('bookings').doc(bookingId).get();
            if (!bookingDoc.exists) {
                return res.status(404).json({ error: 'Booking with provided ID does not exist!' });
            }

            const booking = bookingDoc.data();
            if (booking.status == 'paid') {
                return res.status(409).json({ error: 'This booking has already been paid.' });
            }

            //Calculate price base on cab type, daytime, discount and number of passengers

            //Cabtype multiplier
            const cabType = booking.cabType?.toLowerCase();
            const cabMultiplier = CAB_MULTIPLIERS[cabType];
            if (!cabMultiplier) {
                return res.status(400).json({ error: `Unknown cab type: ${booking.cabType}` });
            }

            //Passengers multiplier
            let passMultiplier;
            const passengers = parseInt(booking.noOfPassengers);
            if (passengers <= 0) {
                return res.status(400).json({ error: 'Number of passengers must be greater than zero!' });
            }
            else if (passengers > 0 && passengers <= 4) {
                passMultiplier = 1;
            }
            else if (passengers > 4 && passengers <= 8) {
                passMultiplier = 2;
            }
            else {
                return res.status(400).json({ error: 'Number of passengers must be 8 or less!' });
            }

            //Time of day multiplier
            const daytimeMultiplier = getDaytimeMultiplier(booking.time);

            //Discount retrieval
            const statsDoc = await db.collection('userStats').doc(booking.email).get();
            //Discount is granted if document exists and discountGranted is true, otherwise no discount is applied
            const discountGranted = statsDoc.exists && statsDoc.data().discountGranted;
            const discount = discountGranted ? LOYALTY_DISCOUNT : DEFAULT_DISCOUNT;

            const start = parseLatLng(booking.startLocation);
            const end = parseLatLng(booking.endLocation);
            const cabFare = await fetchCabFare(start.lat, start.lng, end.lat, end.lng, booking.time);

            //Final price calculation with breakdown
            const totalPrice = parseFloat(cabFare * cabMultiplier * passMultiplier * daytimeMultiplier * discount).toFixed(2);

            const breakdown = {
                bookingId,
                cabFare,
                cabMultiplier: cabMultiplier,
                daytimeMultiplier: daytimeMultiplier,
                passengersMultiplier: { passengers, value: passMultiplier },
                discount,
                totalPrice,
            };

            return res.status(200).json({
                message: 'Price calculated successfully.',
                breakdown,
            });


        }
        catch (err) {
            console.error('Error calculating price:', err);
            return res.status(500).json({ error: 'Internal server error', detail: err.message });
        }
    });

    app.listen(3003, () => {
        console.log('Server is running on port 3003');
        console.log("URL because im lazy: http://localhost:3003/api/payment");
    });
}

async function fetchCabFare(startLat, startLng, endLat, endLng, timeStr) {
    console.log('Api Key in env:', !!process.env.RAPIDAPI_KEY);
    //Calling external api to get base fair from trip based on coordinates, apikey is loaded from .env
    const response = await axios.get(
        'https://taxi-fare-calculator.p.rapidapi.com/search-geo',
        {
            params: {
                dep_lat: startLat,
                dep_lng: startLng,
                arr_lat: endLat,
                arr_lng: endLng,
            },
            headers: {
                'x-rapidapi-host': 'taxi-fare-calculator.p.rapidapi.com',
                'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            },
        }
    );

    //retrieving fares array from response
    const fares = response.data?.journey?.fares;
    if (!fares || fares.length === 0) {
        throw new Error('No fare data returned from external API.');
    }
    
    //Determing the label to refer to
    const hour = parseInt(timeStr.split(':')[0]);
    const isNight = hour < 8;
    const preferredLabel = isNight ? 'by Night' : 'by Day';
    const fallbackLabel = isNight ? 'by Day' : 'by Night';

    //Trying out both fares, in the case that one is not applicable the fallback is used
    const findFare = (label) => fares.find(f => f.name === label);
    let selectedFare = findFare(preferredLabel);

    if (!selectedFare || selectedFare.price_in_cents === 'n/a') {
        selectedFare = findFare(fallbackLabel);
    }

    if (!selectedFare || selectedFare.price_in_cents === 'n/a') {
        throw new Error('No valid fare available from external API (all fares returned n/a).');
    }

    //Converting cents to euros and rounding to 2dp
    const cabFareEuros = parseFloat((selectedFare.price_in_cents / 100).toFixed(2));

    console.log(`Fare selected: "${selectedFare.name}" — €${cabFareEuros} (${selectedFare.estimated ? 'estimated' : 'fixed'})`);

    return cabFareEuros;
}

function getDaytimeMultiplier(timeStr) {
    // timeStr is in "HH:MM" format in 24hr
    const [hour] = timeStr.split(':').map(Number);
    if (hour >= 8) {
        return DAYTIME_MULTIPLIERS.standard;
    } else {
        return DAYTIME_MULTIPLIERS.night;
    }
}

function parseLatLng(locationStr) {
    // parses a lat and long string into a json object
    const [lat, lng] = locationStr.split(',').map(s => parseFloat(s.trim()));
    if (isNaN(lat) || isNaN(lng)) {
        throw new Error(`Invalid location format: "${locationStr}"`);
    }
    return { lat, lng };
}
