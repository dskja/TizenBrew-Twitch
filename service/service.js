const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8086;

const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'tizentwitch',
        timestamp: new Date().toISOString()
    });
});

// Proxy for Twitch API
app.all('*', (req, res) => {
    // Basic proxy for Twitch requests
    res.send('TizenTwitch Service Running');
});

app.listen(PORT, () => {
    console.log(`TizenTwitch service running on port ${PORT}`);
});
