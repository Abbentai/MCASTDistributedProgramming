const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('API running');
    console.log("request sent for /");
});

app.get('/account', (req, res) => {
    res.json(
        {
            username: 'Test Name',
            name: "Dingus",
            surname: "Mc Dingus",
            age: 25,
        });
    console.log("request sent for /account");
});


app.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log("URL because im lazy: http://localhost:3000/account");
});
