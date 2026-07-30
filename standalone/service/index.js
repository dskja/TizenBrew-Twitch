"use strict";

// TizenTwitch Standalone service

const express = require('express');
const app = express();
const PORT = 8099;
const fetch = require('node-fetch');
const { URL } = require('url');

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

                    // Rewrite rules for Twitch domains
                    text = text.replace(/https:\/\/static\.twitchcdn\.net/g, `${proxyPrefix}https://static.twitchcdn.net`);
                    text = text.replace(/https:\/\/player\.twitchcdn\.net/g, `${proxyPrefix}https://player.twitchcdn.net`);
                    text = text.replace(/https:\/\/usher\.twitchcdn\.net/g, `${proxyPrefix}https://usher.twitchcdn.net`);
                    text = text.replace(/https:\/\/video-weaver\.twitchcdn\.net/g, `${proxyPrefix}https://video-weaver.twitchcdn.net`);
                    text = text.replace(/https:\/\/gql\.twitchcdn\.net/g, `${proxyPrefix}https://gql.twitchcdn.net`);
                    text = text.replace(/https:\/\/passport\.twitchcdn\.net/g, `${proxyPrefix}https://passport.twitchcdn.net`);

                    // Fix location references
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
        .catch((error) => {
            console.error(`Proxy Error for [${targetUrl}]: ${error}`);
            console.error(error.stack)
            if (!res.headersSent) {
                res.status(500).send('Proxy Connection Broken');
            }
        });
});

app.listen(PORT, "127.0.0.1");
console.log(`TizenTwitch proxy service running on port ${PORT}`);
