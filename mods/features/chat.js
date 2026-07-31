/**
 * Twitch Chat Support
 * Enables chat functionality for Twitch streams on Tizen TVs
 */

import { createChatUI, addChatMessage } from '../ui/chat.js';

let chatEnabled = true;
let chatVisible = true;
let chatUI = null;

export function toggleChat() {
    chatVisible = !chatVisible;
    if (chatUI) {
        chatUI.style.display = chatVisible ? 'flex' : 'none';
    }
    console.log('[TizenTwitch] Chat visibility:', chatVisible);
}

export function initChat() {
    if (!chatUI) {
        chatUI = createChatUI();
        if (document.body) {
            document.body.appendChild(chatUI);
        }
    }
}

export function handleChatMessage(username, message, color) {
    if (!chatEnabled || !chatVisible) return;
    addChatMessage(username, message, color);
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
} else {
    initChat();
}

console.log('[TizenTwitch] Chat support initialized');
