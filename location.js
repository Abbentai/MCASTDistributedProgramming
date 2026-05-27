const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { getFirestore } = require('firebase-admin/firestore');
const { accountExists } = require('./account.js');
require('dotenv').config();

//Error codes in case you need them
//https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
const { db, appEmitter } = require('./server.js');

//This bascially checks if the script is being ran directtly from node or being imported as a module, this is for function exports 
if (require.main === module) {
    //Initalisation code
    const app = express();
    app.use(express.json());

    app.get('/', (req, res) => {
        res.send('API running');
        console.log("request sent for /");
    });


    app.post('/location', async (req, res) => {
        //Creates a new booking, uploads it to firestore under bookings/{bookingId}, and prevents overwriting existing bookings
        //startLocation and endLocation are coordinates in the form of { lat: number, lng: number }
        try {
            const { houseNum, street, city, country, email } = req.body;

            //Input validation
            if (!houseNum || !street || !city || !country || !email) {
                return res.status(400).json({ error: 'All fields are required!' });
            }

            if (!await accountExists(email)) {
                return res.status(404).json({ error: 'Account with provided email does not exist!' });
            }

            //Constructing location data
            const locationData = {
                houseNum,
                street,
                city,
                country,
                email
            };

            //Storing under locations/{locationId}
            const docRef = db.collection('locations').doc(email).collection('entries').doc(crypto.randomUUID());

            //Prevent overwriting an existing location with same ID
            const existing = await docRef.get();
            if (existing.exists) {
                return res.status(409).json({ error: 'Location already exists' });
            }

            await docRef.set(locationData);

            res.status(201).json({ message: 'Location created', location: locationData });
            console.log(`Location created for: ${email} in ${city}, ${country}`);
        } catch (err) {
            console.error('Error creating location:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });


    app.put('/location/:locationId', async (req, res) => {
        //Updates an existing location based on locationId
        try {
            let { locationId } = req.params;
            const { houseNum, street, city, country, email } = req.body;

            locationId = locationId.trim();

            //Input validation
            if (!email) {
                return res.status(400).json({ error: 'Email is required!' });
            }

            if (!houseNum && !street && !city && !country) {
                return res.status(400).json({ error: 'At least one field must be provided to update!' });
            }

            if (!await accountExists(email)) {
                return res.status(404).json({ error: 'Account with provided email does not exist!' });
            }

            const docRef = db.collection('locations').doc(email).collection('entries').doc(locationId);

            //Check if location exists
            const existing = await docRef.get();
            if (!existing.exists) {
                return res.status(404).json({ error: 'Location not found!' });
            }

            //Constructing update data
            const updateData = {
                houseNum: houseNum,
                street: street,
                city: city,
                country: country
            };

            await docRef.update(updateData);

            res.status(200).json({ message: 'Location updated', updatedFields: updateData });
            console.log(`Location ${locationId} updated for: ${email}`);
        } catch (err) {
            console.error('Error updating location:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.delete('/location/:locationId', async (req, res) => {
        //Deletes a location based on locationId
        try {
            let { locationId } = req.params;
            const { email } = req.body;

            locationId = locationId.trim();

            //Input validation
            if (!email) {
                return res.status(400).json({ error: 'Email is required!' });
            }

            if (!await accountExists(email)) {
                return res.status(404).json({ error: 'Account with provided email does not exist!' });
            }

            const docRef = db.collection('locations').doc(email).collection('entries').doc(locationId);

            //Check if location exists
            const existing = await docRef.get();
            if (!existing.exists) {
                return res.status(404).json({ error: 'Location not found!' });
            }

            await docRef.delete();

            res.status(200).json({ message: 'Location deleted successfully' });
            console.log(`Location ${locationId} deleted for: ${email}`);
        } catch (err) {
            console.error('Error deleting location:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/location/:email', async (req, res) => {
        //Fetches all locations for a specific email
        try {
            let { email } = req.params;

            email = email.trim();

            //Input validation
            if (!email) {
                return res.status(400).json({ error: 'Email is required!' });
            }

            if (!await accountExists(email)) {
                return res.status(404).json({ error: 'Account with provided email does not exist!' });
            }

            const snapshot = await db.collection('locations').doc(email).collection('entries').get();
            if (snapshot.empty) {
                return res.status(404).json({ error: 'No locations found for this email!' });
            }

            const locations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            return res.status(200).json(locations);
        }
        catch (err) {
            console.error('Error retrieving location:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/location/weather/:city', async (req, res) => {
        //Fetches the current weather details for a specific city/locality
        try {
            let { city } = req.params;
            city = city.trim();

            if (!city) {
                return res.status(400).json({ error: 'City is required!' });
            }

            const response = await axios.get('https://weatherapi-com.p.rapidapi.com/current.json', {
                params: { q: city },
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-host': 'weatherapi-com.p.rapidapi.com',
                    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                },
            });

            const { location, current } = response.data;

            //Return a clean subset of the response
            return res.status(200).json({
                location: {
                    name: location.name,
                    region: location.region,
                    country: location.country,
                    localtime: location.localtime,
                },
                weather: {
                    condition: current.condition.text,
                    tempC: current.temp_c,
                    tempF: current.temp_f,
                    feelsLikeC: current.feelslike_c,
                    humidity: current.humidity,
                    windKph: current.wind_kph,
                    windDir: current.wind_dir,
                    uvIndex: current.uv,
                    isDay: current.is_day === 1,
                },
            });

        } catch (err) {
            //WeatherAPI seems to return 400 for locations that aren't count
            if (err.response?.status === 400) {
                return res.status(404).json({ error: `City "${req.params.city}" not found.` });
            }
            console.error('Error fetching weather:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.listen(3003, () => {
        console.log('Server is running on port 3003');
        console.log("URL because im lazy: http://localhost:3003/location");
    });
}

