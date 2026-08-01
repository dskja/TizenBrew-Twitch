/**
 * Twitch Ad Blocker
 * Blocks Twitch ads by intercepting and removing ad-related requests and elements
 * Enhanced version with MutationObserver and broader ad domain blocking
 */

const origFetch = window.fetch;
const origXHR = XMLHttpRequest.prototype.open;
const origXHRSend = XMLHttpRequest.prototype.send;

const adDomains = [
    'video-weaver.twitch.tv',
    'usher.ttvnw.net',
    'ads.twitch.tv',
    'ad.twitch.tv',
    'countess.twitch.tv'
];

const adPatterns = [
    '/gql',
    '/api/channel',
    '/api/ads',
    '/commercial',
    '/sponsored',
    '/ad-macro',
    '/ads_settings',
    '/ad_serving',
    '/doubleclick',
    '/google_ads',
    '/adsystem',
    '/adservice'
];

const adElementSelectors = [
    '[data-a-target="video-ad"]',
    '[data-test-selector="video-ad"]',
    '[data-a-target="ads-ad"]',
    '.ad-banner',
    '.player-ad',
    '.ad-overlay',
    '.commercial-overlay',
    '[data-a-target="ads-ad-container"]',
    '.spike-screen',
    '[data-a-target="squad-stream-ad"]',
    '[data-test-selector="ad-banner"]',
    '.tw-ad-banner',
    '[data-a-target="ad-unit"]',
    'div[class*="ad-"]',
    'div[id*="ad-"]'
];

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

function removeAdElements() {
    adElementSelectors.forEach(function(selector) {
        try {
            var elements = document.querySelectorAll(selector);
            for (var i = 0; i < elements.length; i++) {
                if (elements[i].parentNode) elements[i].parentNode.removeChild(elements[i]);
            }
        } catch (e) {}
    });
}

var observer = null;
function setupObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
                removeAdElements();
                break;
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

var adRemovalInterval = setInterval(removeAdElements, 2000);
setTimeout(function() { clearInterval(adRemovalInterval); }, 120000);

removeAdElements();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
} else {
    setupObserver();
}

console.log('[TizenTwitch] Enhanced ad blocker initialized');

