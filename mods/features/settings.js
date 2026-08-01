/**
 * Settings Panel for TizenTwitch
 * Provides a configurable settings overlay accessible via remote control
 */

var settingsPanel = null;
var settingsVisible = false;
var settings = {
    adblock: true,
    chat: true,
    chatPosition: 'right',
    chatSize: 'medium',
    theme: true,
    streamInfo: true,
    autoQuality: true
};

function loadSettings() {
    try {
        var saved = localStorage.getItem('tizentwitch-settings');
        if (saved) {
            var parsed = JSON.parse(saved);
            settings = Object.assign(settings, parsed);
        }
    } catch (e) {}
}

function saveSettings() {
    try {
        localStorage.setItem('tizentwitch-settings', JSON.stringify(settings));
    } catch (e) {}
}

export function getSettings() {
    return settings;
}

export function updateSetting(key, value) {
    settings[key] = value;
    saveSettings();
    console.log('[TizenTwitch] Setting updated:', key, '=', value);
}

function createSettingsPanel() {
    settingsPanel = document.createElement('div');
    settingsPanel.id = 'tizentwitch-settings-panel';
    settingsPanel.style.cssText = [
        'position: fixed',
        'top: 50%',
        'left: 50%',
        'transform: translate(-50%, -50%)',
        'background: linear-gradient(180deg, #18181b 0%, #0e0e10 100%)',
        'border: 2px solid #9146ff',
        'border-radius: 16px',
        'padding: 32px',
        'color: #efeff1',
        'font-family: Inter, Roobert, Helvetica Neue, Helvetica, Arial, sans-serif',
        'z-index: 10001',
        'min-width: 500px',
        'max-width: 600px',
        'max-height: 80vh',
        'overflow-y: auto',
        'box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7)',
        'display: none'
    ].join(';');

    var header = document.createElement('div');
    header.style.cssText = 'font-size: 24px; font-weight: 700; color: #9146ff; margin-bottom: 24px; text-align: center;';
    header.textContent = 'TizenTwitch Settings';

    var closeBtn = document.createElement('div');
    closeBtn.style.cssText = 'position: absolute; top: 16px; right: 16px; cursor: pointer; font-size: 20px; color: #adadb8;';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', function() { hideSettings(); });

    var content = document.createElement('div');
    content.id = 'tizentwitch-settings-content';
    content.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

    var toggles = [
        { key: 'adblock', label: 'Ad Blocking', desc: 'Block Twitch ads' },
        { key: 'chat', label: 'Chat Overlay', desc: 'Show chat overlay on streams' },
        { key: 'theme', label: 'Twitch Theme', desc: 'Apply Twitch dark theme' },
        { key: 'streamInfo', label: 'Stream Info Overlay', desc: 'Show stream info on demand' },
        { key: 'autoQuality', label: 'Auto Quality', desc: 'Automatically adjust stream quality' }
    ];

    toggles.forEach(function(toggle) {
        var row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;';

        var labelContainer = document.createElement('div');
        var labelEl = document.createElement('div');
        labelEl.style.cssText = 'font-size: 16px; font-weight: 600; color: #efeff1;';
        labelEl.textContent = toggle.label;
        var descEl = document.createElement('div');
        descEl.style.cssText = 'font-size: 12px; color: #adadb8; margin-top: 2px;';
        descEl.textContent = toggle.desc;
        labelContainer.appendChild(labelEl);
        labelContainer.appendChild(descEl);

        var switchEl = document.createElement('div');
        switchEl.id = 'tizentwitch-switch-' + toggle.key;
        switchEl.style.cssText = 'width: 48px; height: 26px; border-radius: 13px; cursor: pointer; transition: background 0.2s; background: ' + (settings[toggle.key] ? '#9146ff' : '#3d3d3d') + '; position: relative;';
        var knob = document.createElement('div');
        knob.style.cssText = 'position: absolute; top: 3px; width: 20px; height: 20px; border-radius: 50%; background: white; transition: left 0.2s; left: ' + (settings[toggle.key] ? '25px' : '3px') + ';';
        switchEl.appendChild(knob);
        switchEl.addEventListener('click', function() {
            settings[toggle.key] = !settings[toggle.key];
            saveSettings();
            switchEl.style.background = settings[toggle.key] ? '#9146ff' : '#3d3d3d';
            knob.style.left = settings[toggle.key] ? '25px' : '3px';
        });

        row.appendChild(labelContainer);
        row.appendChild(switchEl);
        content.appendChild(row);
    });

    var chatPositionRow = document.createElement('div');
    chatPositionRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;';
    var posLabel = document.createElement('div');
    posLabel.style.cssText = 'font-size: 16px; font-weight: 600; color: #efeff1;';
    posLabel.textContent = 'Chat Position';
    var posSelect = document.createElement('select');
    posSelect.style.cssText = 'background: #1f1f23; color: #efeff1; border: 1px solid #3d3d3d; border-radius: 4px; padding: 4px 8px; font-size: 14px;';
    ['right', 'left'].forEach(function(pos) {
        var opt = document.createElement('option');
        opt.value = pos;
        opt.textContent = pos.charAt(0).toUpperCase() + pos.slice(1);
        if (settings.chatPosition === pos) opt.selected = true;
        posSelect.appendChild(opt);
    });
    posSelect.addEventListener('change', function() {
        updateSetting('chatPosition', posSelect.value);
    });
    chatPositionRow.appendChild(posLabel);
    chatPositionRow.appendChild(posSelect);
    content.appendChild(chatPositionRow);

    var chatSizeRow = document.createElement('div');
    chatSizeRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;';
    var sizeLabel = document.createElement('div');
    sizeLabel.style.cssText = 'font-size: 16px; font-weight: 600; color: #efeff1;';
    sizeLabel.textContent = 'Chat Size';
    var sizeSelect = document.createElement('select');
    sizeSelect.style.cssText = 'background: #1f1f23; color: #efeff1; border: 1px solid #3d3d3d; border-radius: 4px; padding: 4px 8px; font-size: 14px;';
    ['small', 'medium', 'large'].forEach(function(size) {
        var opt = document.createElement('option');
        opt.value = size;
        opt.textContent = size.charAt(0).toUpperCase() + size.slice(1);
        if (settings.chatSize === size) opt.selected = true;
        sizeSelect.appendChild(opt);
    });
    sizeSelect.addEventListener('change', function() {
        updateSetting('chatSize', sizeSelect.value);
    });
    chatSizeRow.appendChild(sizeLabel);
    chatSizeRow.appendChild(sizeSelect);
    content.appendChild(chatSizeRow);

    settingsPanel.appendChild(closeBtn);
    settingsPanel.appendChild(header);
    settingsPanel.appendChild(content);

    if (document.body) document.body.appendChild(settingsPanel);
    return settingsPanel;
}

export function showSettings() {
    if (!settingsPanel) createSettingsPanel();
    settingsPanel.style.display = 'block';
    settingsVisible = true;
}

export function hideSettings() {
    if (settingsPanel) settingsPanel.style.display = 'none';
    settingsVisible = false;
}

export function toggleSettings() {
    if (settingsVisible) hideSettings();
    else showSettings();
}

if (typeof window !== 'undefined') {
    window.addEventListener('keydown', function(e) {
        if (e.key === 'ColorF2Yellow' || (e.key === 'F2')) {
            e.preventDefault();
            toggleSettings();
        }
    });
}

loadSettings();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSettingsPanel);
} else {
    createSettingsPanel();
}

console.log('[TizenTwitch] Settings panel initialized');
