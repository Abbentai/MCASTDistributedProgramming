const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const { getFirestore } = require('firebase-admin/firestore');

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

    app.get('/test', (req, res) => {
        const accountData = {
            username: 'Test Name',
            name: 'Dingus',
            surname: 'Mc Dingus',
            age: 25,
        };

        res.json(accountData);
        console.log("request sent for /test");
    });

    app.post('/account', async (req, res) => {
        //Creating a new account within firestore, hashing password before storage, and preventing overwriting existing accounts with the same email
        try {
            const { username, name, surname, email, age, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Both Username and Password are required!' });
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

    app.post('/account/login', async (req, res) => {
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

    app.get('/account/:email', async (req, res) => {
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

    app.listen(3000, () => {
        console.log('Server is running on port 3000');
        console.log("URL because im lazy: http://localhost:3000/account");
    });
}

const db = require('./server.js');

async function accountExists(email) {
    const doc = await db.collection('accounts').doc(email).get();
    return doc.exists;
}


module.exports = { accountExists };


