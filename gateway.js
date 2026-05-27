const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

//Proxy setup for microservices

const services = {
   account: 'http://localhost:3001/api/account',
    notification: 'http://localhost:3001/api/notification',
    booking: 'http://localhost:3002/api/booking',
    payment: 'http://localhost:3003/api/payment',
    location: 'http://localhost:3004/api/location',
};

const callService = (target) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        onProxyReq: (proxyReq, req, res) => {
            console.log(`GATEWAY: ${req.method} ${req.originalUrl} -> ${target}`);
        },
        onError: (err, req, res) => {
            console.error(`[GATEWAY ERROR: ${req.method} ${req.originalUrl}`, err.message);

            res.status(500).json({
                error: 'Gateway error',
                details: err.message,
            });
        },
    });
};

app.use('/api/account', callService(services.account));
app.use('/api/notification', callService(services.notification));
app.use('/api/booking', callService(services.booking));
app.use('/api/payment', callService(services.payment));
app.use('/api/location', callService(services.location));


app.get('/', (req, res) => {
    res.send('API Gateway running');
    console.log("request sent for /");
});

app.listen(3000, () => {
    console.log('API Gateway is running on port 3000');
    console.log("URL because im lazy: http://localhost:3000/");
});