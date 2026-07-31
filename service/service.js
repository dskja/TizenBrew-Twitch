const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 8086;

app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'tizentwitch',
        timestamp: new Date().toISOString()
    });
});

// Proxy for Twitch requests
app.all('*', (req, res) => {
    let targetUrl;
    if (req.url.indexOf('/cors-bypass/') === 0) {
        const rawTarget = req.url.substring('/cors-bypass/'.length);
        targetUrl = rawTarget.indexOf('http') === 0 ? rawTarget : `https://${rawTarget}`;
    } else {
        targetUrl = `https://www.twitch.tv${req.url}`;
    }

    const headers = {};
    for (const key in req.headers) {
        if (Object.prototype.hasOwnProperty.call(req.headers, key)) {
            if (key === 'cookie') {
                headers[key] = req.headers[key]
                    .replace(/__LocalSecure-/g, '__Secure-')
                    .replace(/__LocalHost-/g, '__Host-');
                continue;
            }
            headers[key] = req.headers[key];
        }
    }

    try {
        const parsedUrl = new URL(targetUrl);
        headers['host'] = parsedUrl.host;
    } catch (e) {
        headers['host'] = 'www.twitch.tv';
    }

    headers['origin'] = 'https://www.twitch.tv';
    if (headers['referer']) {
        headers['referer'] = 'https://www.twitch.tv';
    }

    const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method);
    const fetchOptions = {
        method: req.method,
        headers: headers,
        body: hasBody ? JSON.stringify(req.body) : undefined,
        redirect: 'manual'
    };

    fetch(targetUrl, fetchOptions)
        .then(response => {
            res.status(response.status);
            const headerKeys = response.headers.raw();
            for (const key in headerKeys) {
                if (Object.prototype.hasOwnProperty.call(headerKeys, key)) {
                    const lowerKey = key.toLowerCase();
                    if (['content-encoding', 'content-length', 'transfer-encoding', 'content-security-policy', 'alt-svc'].includes(lowerKey)) continue;
                    if (lowerKey === 'set-cookie') {
                        const rawCookies = headerKeys[key];
                        if (Array.isArray(rawCookies)) {
                            const modifiedCookies = rawCookies.map(c => c
                                .replace(/^__Secure-/i, '__LocalSecure-')
                                .replace(/^__Host-/i, '__LocalHost-')
                                .replace(/Domain=[^;]+/i, 'Domain=localhost')
                                .replace(/;\s*Secure/i, '')
                                .replace(/;\s*SameSite=None/i, ''));
                            res.setHeader('Set-Cookie', modifiedCookies);
                            continue;
                        }
                    }
                    res.setHeader(key, response.headers.get(key));
                }
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            if (response.body) {
                response.body.pipe(res);
            } else {
                res.end();
            }
        })
        .catch(error => {
            console.error(`Proxy Error [${targetUrl}]: ${error}`);
            if (!res.headersSent) {
                res.status(502).send('Proxy Error');
            }
        });
});

app.listen(PORT, () => {
    console.log(`TizenTwitch service running on port ${PORT}`);
});
