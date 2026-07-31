/**
 * Twitch Ad Blocker
 * Blocks Twitch ads by intercepting and removing ad-related requests and elements
 */

const origFetch = window.fetch;
const origXHR = XMLHttpRequest.prototype.open;
const origXHRSend = XMLHttpRequest.prototype.send;

// Block known Twitch ad domains
const adDomains = [
    'video-weaver.twitch.tv',
    'usher.ttvnw.net'
];

// Block ad-related API endpoints (specific patterns only)
const adPatterns = [
    '/gql',
    '/api/channel',
    '/api/ads',
    '/commercial',
    '/sponsored',
    '/ad-macro',
    '/ads_settings'
];

// Override fetch to block ad requests
window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string') {
        for (const domain of adDomains) {
            if (url.includes(domain)) {
                for (const pattern of adPatterns) {
                    if (url.includes(pattern)) {
                        console.log('[TizenTwitch] Blocked ad request:', url);
                        return Promise.resolve(new Response('{}', { status: 200 }));
                    }
                }
            }
        }
    }
    return origFetch.apply(this, args);
};

// Override XMLHttpRequest to block ad requests
XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    for (const pattern of adPatterns) {
        if (url.includes(pattern)) {
            console.log('[TizenTwitch] Blocked XHR ad request:', url);
            this._blocked = true;
            return;
        }
    }
    return origXHR.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function() {
    if (this._blocked) {
        return;
    }
    return origXHRSend.apply(this, arguments);
};

// Remove ad elements from DOM
function removeAdElements() {
    const adSelectors = [
        '[data-a-target="video-ad"]',
        '[data-test-selector="video-ad"]',
        '.ad-banner',
        '.player-ad',
        '.ad-overlay',
        '.commercial-overlay'
    ];

    adSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            console.log('[TizenTwitch] Removed ad element:', selector);
            el.remove();
        });
    });
}

// Run periodically to catch dynamically loaded ads
setInterval(removeAdElements, 2000);

// Initial cleanup
removeAdElements();

console.log('[TizenTwitch] Ad blocker initialized');
