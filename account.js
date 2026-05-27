const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const { getFirestore } = require('firebase-admin/firestore');

//Error codes in case you need them
//https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
const { db, appEmitter } = require('./server.js');

//This bascially checks if the script is being ran directtly from node or being imported as a module, this is for function exports 
if (require.main === module) {
    //Initalisation code
    const app = express();
    app.use(express.json());

    app.get('/api/account', (req, res) => {
        res.send('Account service is running');
        console.log("request sent for /api/account");
    });

    app.post('/api/account', async (req, res) => {
        //Creating a new account within firestore, hashing password before storage, and preventing overwriting existing accounts with the same email
        try {
            const { username, name, surname, email, age, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Both username and password are required!' });
            }

            //Password Hashing
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const accountData = {
                username,
                name,
                surname,
                email,
                age,
                passwordHash,
                createdAt: new Date(),
            };

            //Storing under accounts/{email}
            const docRef = db.collection('accounts').doc(email);

            //Prevent overwriting an existing account
            const existing = await docRef.get();
            if (existing.exists) {
                return res.status(409).json({ error: 'Account already exists' });
            }

            await docRef.set(accountData);

            //Return the account without the hash
            safeAccountData = accountData;
            delete safeAccountData.passwordHash;

            res.status(201).json({ message: 'Account created', account: safeAccountData });
            console.log(`Account created for: ${username}`);
        } catch (err) {
            console.error('Error creating account:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/account/login', async (req, res) => {
        //Login endpoint, checks if the email exists and compares password has to the password provided, returning either a success of failure message
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required!' });
            }

            const doc = await db.collection('accounts').doc(email).get();

            if (!doc.exists) {
                return res.status(404).json({ error: 'Invalid email or password' });
            }

            const accountData = doc.data();
            const passwordMatch = await bcrypt.compare(password, accountData.passwordHash);

            if (passwordMatch) {
                res.json({ message: 'Login successful' });
                console.log(`Login successful for: ${email}`);
            } else {
                res.status(401).json({ error: 'Invalid password' });
                console.log(`Login failed for: ${email} - Invalid password`);
            }
        } catch (err) {
            console.error('Error during login:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/account/:email', async (req, res) => {
        //Fetches account from firestore based on the email, returning details without the password hash
        try {
            const { email } = req.params;
            const doc = await db.collection('accounts').doc(email).get();

            if (!doc.exists) {
                return res.status(404).json({ error: 'Account not found' });
            }

            //Return the account without the hash
            safeAccountData = doc.data();
            delete safeAccountData.passwordHash;

            res.json(safeAccountData);
            console.log(`Fetched account for: ${email}`);
        } catch (err) {
            console.error('Error fetching account:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.listen(3001, () => {
        console.log('Server is running on port 3001');
        console.log("URL because im lazy: http://localhost:3001/api/account");
    });

    app.post('/api/notification/:email', async (req, res) => {
        //Saving a notification to the database
        try {
            const { header, message, type } = req.body;
            const { email } = req.params;

            if (!header || !message || !type) {
                return res.status(400).json({ error: 'Header, message, and type are required!' });
            }

            accountExists(email).then(exists => {
                if (!exists) {
                    return res.status(404).json({ error: 'Account with provided email does not exist!' });
                }
            });

            const notificationData = {
                header,
                message,
                type,
                createdAt: new Date(),
            };

            //Storing under accounts/{email}/notifications/{autoId}
            const docRef = db.collection('accounts').doc(email).collection('notifications').doc(crypto.randomUUID());

            await docRef.set(notificationData);

            res.status(201).json({ message: 'Notification created' });
            console.log(`Notification created for: ${email}`);
        } catch (err) {
            console.error('Error creating notification:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/notification/:email', async (req, res) => {
        //Fetches all notifications for a specific email
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

            const snapshot = await db.collection('accounts').doc(email).collection('notifications').get();
            if (snapshot.empty) {
                return res.status(404).json({ error: 'No notifications found for this email!' });
            }

            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            return res.status(200).json(notifications);
        }
        catch (err) {
            console.error('Error retrieving notification:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}


async function accountExists(email) {
    const doc = await db.collection('accounts').doc(email).get();
    return doc.exists;
}

module.exports = { accountExists };


