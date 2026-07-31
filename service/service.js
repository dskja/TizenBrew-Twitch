const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 8099;

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(url) {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(url);
    return null;
}

function setCached(url, data) {
    cache.set(url, { data, timestamp: Date.now() });
    if (cache.size > 1000) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
}

app.use(cors({
    origin: true,
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
                if (req.headers[key]) {
                    headers[key] = req.headers[key]
                        .replace(/__LocalSecure-/g, '__Secure-')
                        .replace(/__LocalHost-/g, '__Host-');
                }
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
    headers['accept-encoding'] = 'identity';
    if (headers['referer']) {
        headers['referer'] = 'https://www.twitch.tv';
    }

    const hasBody = ['POST', 'PUT', 'PATCH'].indexOf(req.method) !== -1;
    const contentType = req.headers['content-type'] || '';
    let body = undefined;
    if (hasBody) {
        if (contentType.indexOf('application/json') !== -1) {
            body = JSON.stringify(req.body);
        } else if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
            body = new URLSearchParams(req.body).toString();
            headers['content-type'] = 'application/x-www-form-urlencoded';
        } else {
            body = JSON.stringify(req.body);
        }
    }
    const fetchOptions = {
        method: req.method,
        headers: headers,
        body: body,
        redirect: 'manual'
    };

    // Check cache for GET requests to static assets
    if (req.method === 'GET' && (targetUrl.indexOf('.js') !== -1 || targetUrl.indexOf('.css') !== -1 || targetUrl.indexOf('.png') !== -1 || targetUrl.indexOf('.jpg') !== -1 || targetUrl.indexOf('.svg') !== -1)) {
        const cached = getCached(targetUrl);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(cached);
        }
    }

    fetch(targetUrl, fetchOptions)
        .then(response => {
            res.status(response.status);
            const headerKeys = response.headers.raw();
            for (const key in headerKeys) {
                if (Object.prototype.hasOwnProperty.call(headerKeys, key)) {
                    const lowerKey = key.toLowerCase();
                    const skipHeaders = ['content-encoding', 'content-length', 'transfer-encoding', 'content-security-policy', 'alt-svc'];
                    if (req.url.indexOf('/cors-bypass/') === 0) skipHeaders.push('access-control-allow-origin');
                    if (skipHeaders.indexOf(lowerKey) !== -1) continue;
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

            const respContentType = response.headers.get('content-type') || '';

            if (respContentType.indexOf('text/html') !== -1 ||
                respContentType.indexOf('application/json') !== -1 ||
                respContentType.indexOf('javascript') !== -1 ||
                respContentType.indexOf('text/css') !== -1) {

                return response.text().then(text => {
                    const proxyPrefix = `http://localhost:${PORT}/cors-bypass/`;
                    const domainsToRewrite = [
                        'static.twitchcdn.net',
                        'player.twitchcdn.net',
                        'usher.twitchcdn.net',
                        'video-weaver.twitchcdn.net',
                        'gql.twitchcdn.net',
                        'passport.twitchcdn.net'
                    ];
                    for (const domain of domainsToRewrite) {
                        text = text.replace(new RegExp(`https://${domain}`, 'g'), `${proxyPrefix}https://${domain}`);
                    }
                    text = text.replace(/=window\.location\.href;/g, '=window.location.href.replace("http://localhost:8099", "https://www.twitch.tv");');
                    text = text.replace(/=document\.location\.href/g, '=document.location.href.replace("http://localhost:8099", "https://www.twitch.tv")');
                    // Cache static assets
                    if (req.method === 'GET' && (targetUrl.indexOf('.js') !== -1 || targetUrl.indexOf('.css') !== -1)) {
                        setCached(targetUrl, text);
                        res.setHeader('X-Cache', 'MISS');
                    }
                    res.send(text);
                });
            } else {
                if (response.body) {
                    if (respContentType.indexOf('video') !== -1 || respContentType.indexOf('stream') !== -1) {
                        res.setHeader('Cache-Control', 'no-cache');
                        res.setHeader('Connection', 'keep-alive');
                    }
                    response.body.pipe(res);
                } else {
                    res.end();
                }
            }
        })
        .catch(error => {
            console.error(`Proxy Error [${targetUrl}]: ${error}`);
            if (!res.headersSent) {
                if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
                    var retryCount = (req._retryCount || 0) + 1;
                    req._retryCount = retryCount;
                    if (retryCount <= 3) {
                        console.log(`Retrying request to ${targetUrl} (attempt ${retryCount}/3)`);
                        setTimeout(function() {
                            fetch(targetUrl, fetchOptions)
                                .then(function(response) {
                                    res.status(response.status);
                                    var headerKeys = response.headers.raw();
                                    for (var key in headerKeys) {
                                        if (Object.prototype.hasOwnProperty.call(headerKeys, key)) {
                                            var lowerKey = key.toLowerCase();
                                            var skipHeaders = ['content-encoding', 'content-length', 'transfer-encoding', 'content-security-policy', 'alt-svc'];
                                            if (req.url.indexOf('/cors-bypass/') === 0) skipHeaders.push('access-control-allow-origin');
                                            if (skipHeaders.indexOf(lowerKey) !== -1) continue;
                                            if (lowerKey === 'set-cookie') {
                                                var rawCookies = headerKeys[key];
                                                if (Array.isArray(rawCookies)) {
                                                    var modifiedCookies = rawCookies.map(function(c) { return c
                                                        .replace(/^__Secure-/i, '__LocalSecure-')
                                                        .replace(/^__Host-/i, '__LocalHost-')
                                                        .replace(/Domain=[^;]+/i, 'Domain=localhost')
                                                        .replace(/;\s*Secure/i, '')
                                                        .replace(/;\s*SameSite=None/i, ''); });
                                                    res.setHeader('Set-Cookie', modifiedCookies);
                                                    continue;
                                                }
                                            }
                                            res.setHeader(key, response.headers.get(key));
                                        }
                                    }
                                    res.setHeader('Access-Control-Allow-Origin', '*');
                                    var respContentType = response.headers.get('content-type') || '';
                                    if (respContentType.indexOf('text/html') !== -1 ||
                                        respContentType.indexOf('application/json') !== -1 ||
                                        respContentType.indexOf('javascript') !== -1 ||
                                        respContentType.indexOf('text/css') !== -1) {
                                        return response.text().then(function(text) {
                                            var proxyPrefix = 'http://localhost:' + PORT + '/cors-bypass/';
                                            var domainsToRewrite = [
                                                'static.twitchcdn.net',
                                                'player.twitchcdn.net',
                                                'usher.twitchcdn.net',
                                                'video-weaver.twitchcdn.net',
                                                'gql.twitchcdn.net',
                                                'passport.twitchcdn.net'
                                            ];
                                            for (var i = 0; i < domainsToRewrite.length; i++) {
                                                text = text.replace(new RegExp('https://' + domainsToRewrite[i], 'g'), proxyPrefix + 'https://' + domainsToRewrite[i]);
                                            }
                                            text = text.replace(/=window\.location\.href;/g, '=window.location.href.replace("http://localhost:8099", "https://www.twitch.tv");');
                                            text = text.replace(/=document\.location\.href/g, '=document.location.href.replace("http://localhost:8099", "https://www.twitch.tv")');
                                            res.send(text);
                                        });
                                    } else {
                                        if (response.body) {
                                            response.body.pipe(res);
                                        } else {
                                            res.end();
                                        }
                                    }
                                })
                                .catch(function() {
                                    if (!res.headersSent) res.status(503).send('Service Unavailable');
                                });
                        }, 1000);
                    } else {
                        res.status(503).send('Service Unavailable after retries');
                    }
                } else {
                    res.status(502).send('Proxy Error');
                }
            }
        });
});

app.listen(PORT, function(err) {
    if (err) {
        console.error('Failed to listen on port ' + PORT + ':', err);
    } else {
        console.log('TizenTwitch service running on port ' + PORT);
    }
});
