const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const { getFirestore } = require('firebase-admin/firestore');
const { accountExists } = require('./account');
require('./listeners');

//Error codes in case you need them
//https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
const { db, appEmitter } = require('./server.js');

//This bascially checks if the script is being ran directtly from node or being imported as a module, this is for function exports 
if (require.main === module) {
    //Initalisation code
    const app = express();
    app.use(express.json());

    app.get('/api/booking', (req, res) => {
        res.send('Booking service is running');
        console.log("request sent for /api/booking");
    });


    app.post('/api/booking', async (req, res) => {
        //Creates a new booking, uploads it to firestore under bookings/{bookingId}, and prevents overwriting existing bookings
        //startLocation and endLocation are coordinates in the form of { lat: number, lng: number }
        try {
            const { startLocation, endLocation, date, time, noOfPassengers, cabType, email } = req.body;

            const lowerCabType = cabType.toLowerCase();

            //Input validation
            if (!startLocation || !endLocation || !date || !time || !noOfPassengers || !lowerCabType || !email) {
                return res.status(400).json({ error: 'All fields are required!' });
            }

            if (!await accountExists(email)) {
                return res.status(404).json({ error: 'Account with provided email does not exist!' });
            }

            if (noOfPassengers <= 0) {
                return res.status(400).json({ error: 'Number of passengers must be greater than zero!' });
            }

            if (lowerCabType !== 'economic' && lowerCabType !== 'premium' && lowerCabType !== 'executive') {
                return res.status(400).json({ error: 'Cab type must be either Economic, Premium, or Executive!' });
            }

            //Constructing booking data
            const bookingData = {
                bookingId: `${email}-${Date.now()}`,
                startLocation,
                endLocation,
                date,
                time,
                noOfPassengers,
                cabType,
                email,
                createdAt: new Date(),
            };

            //Storing under bookings/{bookingId}
            const docRef = db.collection('bookings').doc(bookingData.bookingId);

            //Prevent overwriting an existing booking with same ID
            const existing = await docRef.get();
            if (existing.exists) {
                return res.status(409).json({ error: 'Booking already exists' });
            }

            await docRef.set(bookingData);

            // Notify listeners that a booking was successfully created
            appEmitter.emit('bookingCreated', { email, bookingId: bookingData.bookingId });

            res.status(201).json({ message: 'Booking created', booking: bookingData });
            console.log(`Booking created for: ${email} with ID: ${bookingData.bookingId}`);
        } catch (err) {
            console.error('Error creating booking:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    //You need to test this one later considering date being passed
    app.get('/api/booking/getAllBookings/:email/:status', async (req, res) => {
        //Fetches all bookings based on status, either past or upcoming.
        try {
            const { email, status } = req.params;

            if (status != "past" && status != "upcoming") {
                return res.status(400).json({ error: 'Status must be either past or upcoming!' });
            }

            if (!email) {
                return res.status(400).json({ error: 'Email is required!' });
            }

            const bookings = await db.collection('bookings').get();
            const now = new Date();
            const bookingData = [];

            bookings.forEach((doc) => {
                const data = doc.data();

                //Parsing string temporarily before changed to a straight up timestamp 
                const [day, month, year] = data.date.split('-');
                const [hours, minutes] = data.time.split(':');

                const dateTime = new Date(
                    Number(year),
                    Number(month) - 1,
                    Number(day),
                    Number(hours),
                    Number(minutes)
                );

                if (data.email === email) {
                    if (status === "past" && dateTime < now) {

                        bookingData.push(doc.data());
                    }
                    else if (status === "upcoming" && dateTime >= now) {
                        bookingData.push(doc.data());
                    }
                }
            });

            if (bookingData.length === 0) {
                return res.status(404).json({ error: 'No bookings found with the specified status!' });
            }

            res.json(bookingData);
            console.log(`Fetched all bookings with status: ${status}`);
        } catch (err) {
            console.error('Error fetching bookings:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.listen(3002, () => {
        console.log('Server is running on port 3002');
        console.log("URL because im lazy: http://localhost:3002/api/booking");
    });
}

