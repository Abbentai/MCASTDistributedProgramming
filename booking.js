const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const { getFirestore } = require('firebase-admin/firestore');
const { accountExists } = require('./account');

//Error codes in case you need them
//https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status

//This bascially checks if the script is being ran directtly from node or being imported as a module, this is for function exports 
if (require.main === module) {
    //Initalisation code
    const app = express();
    app.use(express.json());

    app.get('/', (req, res) => {
        res.send('API running');
        console.log("request sent for /");
    });


    app.post('/booking', async (req, res) => {
        try {
            const { startLocation, endLocation, dateTime, noOfPassengers, cabType, email } = req.body;

            lowerCabType = cabType.toLowerCase();

            //Input validation
            if (!startLocation || !endLocation || !dateTime || !noOfPassengers || !lowerCabType || !email) {
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
                dateTime,
                noOfPassengers,
                cabType,
                email,
                "status": "pending",
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

            res.status(201).json({ message: 'Booking created', booking: bookingData });
            console.log(`Booking created for: ${email} with ID: ${bookingData.bookingId}`);
        } catch (err) {
            console.error('Error creating booking:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // app.post('/account/login', async (req, res) => {
    //     //Login endpoint, checks if the email exists and compares password has to the password provided, returning either a success of failure message
    //     try {
    //         const { email, password } = req.body;
    //         if (!email || !password) {
    //             return res.status(400).json({ error: 'Email and password are required!' });
    //         }

    //         const doc = await db.collection('accounts').doc(email).get();

    //         if (!doc.exists) {
    //             return res.status(404).json({ error: 'Invalid email or password' });
    //         }

    //         const accountData = doc.data();
    //         const passwordMatch = await bcrypt.compare(password, accountData.passwordHash);

    //         if (passwordMatch) {
    //             res.json({ message: 'Login successful' });
    //             console.log(`Login successful for: ${email}`);
    //         } else {
    //             res.status(401).json({ error: 'Invalid password' });
    //             console.log(`Login failed for: ${email} - Invalid password`);
    //         }
    //     } catch (err) {
    //         console.error('Error during login:', err);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // });

    // app.get('/account/:email', async (req, res) => {
    //     //Fetches account from firestore based on the email, returning details without the password hash
    //     try {
    //         const { email } = req.params;
    //         const doc = await db.collection('accounts').doc(email).get();

    //         if (!doc.exists) {
    //             return res.status(404).json({ error: 'Account not found' });
    //         }

    //         //Return the account without the hash
    //         safeAccountData = doc.data();
    //         delete safeAccountData.passwordHash;

    //         res.json(safeAccountData);
    //         console.log(`Fetched account for: ${email}`);
    //     } catch (err) {
    //         console.error('Error fetching account:', err);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // });


    app.listen(3001, () => {
        console.log('Server is running on port 3001');
        console.log("URL because im lazy: http://localhost:3001/booking");
    });
}

const db = require('./server.js');
