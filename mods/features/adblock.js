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
window.fetch = function() {
    var url = arguments[0];
    if (typeof url === 'string') {
        for (var i = 0; i < adDomains.length; i++) {
            if (url.indexOf(adDomains[i]) !== -1) {
                for (var j = 0; j < adPatterns.length; j++) {
                    if (url.indexOf(adPatterns[j]) !== -1) {
                        console.log('[TizenTwitch] Blocked ad request:', url);
                        return Promise.resolve(new Response('{}', { status: 200 }));
                    }
                }
            }
        }
    }
    return origFetch.apply(this, arguments);
};

// Override XMLHttpRequest to block ad requests
XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    if (typeof url === 'string') {
        for (var i = 0; i < adDomains.length; i++) {
            if (url.indexOf(adDomains[i]) !== -1) {
                for (var j = 0; j < adPatterns.length; j++) {
                    if (url.indexOf(adPatterns[j]) !== -1) {
                        console.log('[TizenTwitch] Blocked XHR ad request:', url);
                        this._blocked = true;
                        return;
                    }
                }
            }
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

    adSelectors.forEach(function(selector) {
        var elements = document.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i++) {
            console.log('[TizenTwitch] Removed ad element:', selector);
            if (elements[i].parentNode) elements[i].parentNode.removeChild(elements[i]);
        }
    });
}

// Run periodically to catch dynamically loaded ads, with auto-stop after 60s
var adRemovalInterval = setInterval(removeAdElements, 2000);
setTimeout(function() { clearInterval(adRemovalInterval); }, 60000);

// Initial cleanup
removeAdElements();

console.log('[TizenTwitch] Ad blocker initialized');
