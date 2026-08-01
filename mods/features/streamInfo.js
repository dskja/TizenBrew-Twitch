/**
 * Stream Info Overlay
 * Shows stream title, channel name, viewer count, and uptime overlay
 */

var overlay = null;
var overlayTimeout = null;
var overlayVisible = false;

function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'tizentwitch-stream-overlay';
    overlay.style.cssText = [
        'position: fixed',
        'top: 20px',
        'left: 20px',
        'background: rgba(14, 14, 16, 0.85)',
        'backdrop-filter: blur(8px)',
        'border: 1px solid rgba(145, 70, 255, 0.3)',
        'border-radius: 12px',
        'padding: 16px 20px',
        'color: #efeff1',
        'font-family: Inter, Roobert, Helvetica Neue, Helvetica, Arial, sans-serif',
        'z-index: 9999',
        'max-width: 400px',
        'transition: opacity 0.3s ease',
        'opacity: 0',
        'pointer-events: none'
    ].join(';');

    var titleEl = document.createElement('div');
    titleEl.id = 'tizentwitch-overlay-title';
    titleEl.style.cssText = 'font-size: 16px; font-weight: 700; color: #efeff1; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

    var channelEl = document.createElement('div');
    channelEl.id = 'tizentwitch-overlay-channel';
    channelEl.style.cssText = 'font-size: 14px; color: #9146ff; font-weight: 600; margin-bottom: 8px;';

    var statsEl = document.createElement('div');
    statsEl.id = 'tizentwitch-overlay-stats';
    statsEl.style.cssText = 'font-size: 12px; color: #adadb8; display: flex; gap: 16px;';

    overlay.appendChild(titleEl);
    overlay.appendChild(channelEl);
    overlay.appendChild(statsEl);

    if (document.body) document.body.appendChild(overlay);
    return overlay;
}

function showOverlay() {
    if (!overlay) createOverlay();
    updateOverlayInfo();
    overlay.style.opacity = '1';
    overlayVisible = true;
    if (overlayTimeout) clearTimeout(overlayTimeout);
    overlayTimeout = setTimeout(function() {
        overlay.style.opacity = '0';
        overlayVisible = false;
    }, 5000);
}

function hideOverlay() {
    if (overlay) overlay.style.opacity = '0';
    overlayVisible = false;
    if (overlayTimeout) clearTimeout(overlayTimeout);
}

function updateOverlayInfo() {
    if (!overlay) return;

    var titleEl = document.getElementById('tizentwitch-overlay-title');
    var channelEl = document.getElementById('tizentwitch-overlay-channel');
    var statsEl = document.getElementById('tizentwitch-overlay-stats');
    if (!titleEl || !channelEl || !statsEl) return;

    var title = '';
    var channel = '';
    var viewers = '';
    var uptime = '';

    try {
        var titleNode = document.querySelector('[data-a-target="stream-title"]');
        if (titleNode) title = titleNode.textContent || titleNode.getAttribute('title') || '';
    } catch (e) {}

    try {
        var channelNode = document.querySelector('[data-a-target="channel-name"]') || document.querySelector('.channel-name');
        if (channelNode) channel = channelNode.textContent || '';
    } catch (e) {}

    try {
        var viewerNode = document.querySelector('[data-a-target="animated-channel-viewers-count"]');
        if (viewerNode) viewers = viewerNode.textContent || '';
    } catch (e) {}

    try {
        var liveTimeNode = document.querySelector('[data-a-target="stream-preview-card-live-since"]');
        if (liveTimeNode) uptime = liveTimeNode.textContent || '';
    } catch (e) {}

    titleEl.textContent = title || 'Unknown Stream';
    channelEl.textContent = channel ? channel : '';
    statsEl.innerHTML = '';
    if (viewers) {
        var vSpan = document.createElement('span');
        vSpan.textContent = viewers + ' viewers';
        statsEl.appendChild(vSpan);
    }
    if (uptime) {
        var uSpan = document.createElement('span');
        uSpan.textContent = 'Live: ' + uptime;
        statsEl.appendChild(uSpan);
    }
}

export function initStreamOverlay() {
    if (!overlay) createOverlay();
    setInterval(function() {
        if (overlayVisible) updateOverlayInfo();
    }, 3000);
    console.log('[TizenTwitch] Stream overlay initialized');
}

export function toggleOverlay() {
    if (overlayVisible) hideOverlay();
    else showOverlay();
}

if (typeof window !== 'undefined') {
    window.addEventListener('keydown', function(e) {
        if (e.key === 'Info' || e.key === 'F5') {
            e.preventDefault();
            toggleOverlay();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStreamOverlay);
} else {
    initStreamOverlay();
}

console.log('[TizenTwitch] Stream info overlay initialized');
