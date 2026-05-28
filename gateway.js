const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:5500', 'http://127.0.0.1:5500'];

//CORS setup to allow requests from the frontend
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

//Proxy setup for microservices

const services = {
    account: process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3001/api/account',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3001/api/notification',
    booking: process.env.BOOKING_SERVICE_URL || 'http://localhost:3002/api/booking',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003/api/payment',
    location: process.env.LOCATION_SERVICE_URL || 'http://localhost:3004/api/location',
};
const callService = (target) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: {
            '^/api/payment': '/api/payment', 
        },
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

