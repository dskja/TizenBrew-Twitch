"use strict";

// TizenTwitch Standalone service

const express = require('express');
const app = express();
const PORT = 8099;
const fetch = require('node-fetch');
const { URL } = require('url');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(url) {
    return url;
}

function getCached(url) {
    const key = getCacheKey(url);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCached(url, data) {
    const key = getCacheKey(url);
    cache.set(key, { data, timestamp: Date.now() });
    
    // Limit cache size
    if (cache.size > 1000) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.get('/tizentwitch/getState', (req, res) => {
    res.json({ canConnectToDaemon: false, isConnecting: false });
});

app.all('*', (req, res) => {
    const isCorsBypass = req.path.indexOf('/cors-bypass/') === 0;

    let targetUrl;
    if (isCorsBypass) {
        const rawTarget = req.path.substring('/cors-bypass/'.length);
        targetUrl = rawTarget.indexOf('http') === 0 ? rawTarget : `https://${rawTarget}`;
    } else {
        targetUrl = `https://www.twitch.tv${req.path}`;
    }

    // Check cache for GET requests to static assets
    if (req.method === 'GET' && (targetUrl.includes('.js') || targetUrl.includes('.css') || targetUrl.includes('.png') || targetUrl.includes('.jpg') || targetUrl.includes('.svg'))) {
        const cached = getCached(targetUrl);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            return res.send(cached);
        }
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
            headers[key] = req.headers[key]
        }
    }

    try {
        const parsedUrl = new URL(targetUrl);
        headers['host'] = parsedUrl.host;
    } catch (e) {
        headers['host'] = isCorsBypass ? 'www.twitch.tv' : 'www.twitch.tv';
    }

    headers['origin'] = 'https://www.twitch.tv';
    if (headers['referer']) {
        headers['referer'] = 'https://www.twitch.tv';
    }

    headers['accept-encoding'] = 'gzip, deflate';

    const hasBody = ['POST', 'PUT', 'PATCH'].indexOf(req.method) !== -1;
    const fetchOptions = {
        method: req.method,
        headers: headers,
        body: hasBody ? JSON.stringify(req.body) : undefined,
        redirect: 'manual'
    };

    fetch(targetUrl, fetchOptions)
        .then((response) => {
            if (req.method === 'OPTIONS') {
                res.status(200);
            } else {
                res.status(response.status);
            }

            const headerKeys = response.headers.raw();
            for (const key in headerKeys) {
                if (Object.prototype.hasOwnProperty.call(headerKeys, key)) {
                    const lowerKey = key.toLowerCase();
                    const skipHeaders = ['content-encoding', 'content-length', 'transfer-encoding', 'content-security-policy', 'alt-svc'];
                    if (isCorsBypass) skipHeaders.push('access-control-allow-origin');

                    if (skipHeaders.indexOf(lowerKey) !== -1) continue;

                    const value = response.headers.get(key);
                    if (lowerKey === 'set-cookie') {
                        const rawCookies = headerKeys[key];
                        if (Array.isArray(rawCookies)) {
                            const modifiedCookies = rawCookies.map(cookieStr => {
                                return cookieStr
                                    .replace(/^__Secure-/i, '__LocalSecure-')
                                    .replace(/^__Host-/i, '__LocalHost-')
                                    .replace(/Domain=[^;]+/i, 'Domain=localhost')
                                    .replace(/;\s*Secure/i, '')
                                    .replace(/;\s*SameSite=None/i, '')
                                    .replace(/;\s*;/g, ';')
                                    .replace(/;\s*$/, '');
                            });
                            res.setHeader('Set-Cookie', modifiedCookies);
                            continue;
                        }
                    }

                    res.setHeader(key, value);
                }
            }

            res.setHeader('Access-Control-Allow-Origin', '*');

            const contentType = response.headers.get('content-type') || '';

            if (contentType.indexOf('text/html') !== -1 ||
                contentType.indexOf('application/json') !== -1 ||
                contentType.indexOf('javascript') !== -1 ||
                contentType.indexOf('text/css') !== -1) {

                return response.text().then((text) => {
                    const proxyPrefix = `http://localhost:${PORT}/cors-bypass/`;

                    // Optimized URL rewriting with single pass
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

                    // Fix location references
                    text = text.replace(/=window\.location\.href;/g, '=window.location.href.replace("http://localhost:8099", "https://www.twitch.tv");');
                    text = text.replace(/=document\.location\.href/g, '=document.location.href.replace("http://localhost:8099", "https://www.twitch.tv")');

                    // Cache static assets
                    if (req.method === 'GET' && (targetUrl.includes('.js') || targetUrl.includes('.css'))) {
                        setCached(targetUrl, text);
                        res.setHeader('X-Cache', 'MISS');
                    }

                    res.send(text);
                });
            } else {
                // Video streaming optimizations - pipe directly for better performance
                if (response.body) {
                    // Add streaming headers for video content
                    if (contentType.includes('video') || contentType.includes('stream')) {
                        res.setHeader('Cache-Control', 'no-cache');
                        res.setHeader('Connection', 'keep-alive');
                    }
                    response.body.pipe(res);
                } else {
                    res.end();
                }
            }
        })
        .catch((error) => {
            console.error(`Proxy Error for [${targetUrl}]: ${error}`);
            console.error(error.stack)
            
            // Improved error recovery
            if (!res.headersSent) {
                if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
                    // Retry on network errors
                    console.log(`Retrying request to ${targetUrl}`);
                    setTimeout(() => {
                        fetch(targetUrl, fetchOptions)
                            .then(response => {
                                res.status(response.status);
                                const headerKeys = response.headers.raw();
                                for (const key in headerKeys) {
                                    if (Object.prototype.hasOwnProperty.call(headerKeys, key)) {
                                        const lowerKey = key.toLowerCase();
                                        const skipHeaders = ['content-encoding', 'content-length', 'transfer-encoding', 'content-security-policy', 'alt-svc'];
                                        if (isCorsBypass) skipHeaders.push('access-control-allow-origin');
                                        if (skipHeaders.indexOf(lowerKey) !== -1) continue;
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
                            .catch(() => {
                                res.status(503).send('Service Unavailable');
                            });
                    }, 1000);
                } else {
                    res.status(500).send('Proxy Connection Broken');
                }
            }
        });
});

app.listen(PORT, "127.0.0.1");
console.log(`TizenTwitch proxy service running on port ${PORT}`);
