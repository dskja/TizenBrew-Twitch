/**
 * Twitch Chat Support
 * Enables chat functionality for Twitch streams on Tizen TVs
 */

let chatEnabled = true;
let chatVisible = true;

// Toggle chat visibility
function toggleChat() {
    chatVisible = !chatVisible;
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        chatContainer.style.display = chatVisible ? 'block' : 'none';
    }
    console.log('[TizenTwitch] Chat visibility:', chatVisible);
}

// Initialize chat UI
function initChat() {
    // Create chat container if it doesn't exist
    if (!document.querySelector('.chat-container')) {
        const chatContainer = document.createElement('div');
        chatContainer.className = 'chat-container';
        chatContainer.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 300px;
            height: 400px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 10px;
            overflow: hidden;
            z-index: 1000;
        `;
        document.body.appendChild(chatContainer);
    }
}

// Chat message handling
function handleChatMessage(message) {
    if (!chatEnabled || !chatVisible) return;
    
    const chatContainer = document.querySelector('.chat-container');
    if (!chatContainer) return;

    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
        padding: 8px 12px;
        margin: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        font-size: 14px;
        color: white;
    `;
    messageElement.textContent = message;
    chatContainer.appendChild(messageElement);

    // Keep only last 50 messages
    while (chatContainer.children.length > 50) {
        chatContainer.removeChild(chatContainer.firstChild);
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
} else {
    initChat();
}

console.log('[TizenTwitch] Chat support initialized');
