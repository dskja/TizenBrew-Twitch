/**
 * Chat UI Component
 * Manages the visual appearance of the Twitch chat
 */

export function createChatUI() {
    const chatUI = document.createElement('div');
    chatUI.className = 'twitch-chat-ui';
    chatUI.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 350px;
        max-height: 500px;
        background: linear-gradient(180deg, #18181b 0%, #0e0e10 100%);
        border: 2px solid #9146ff;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 12px 16px;
        background: #9146ff;
        color: white;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = '<span>Twitch Chat</span><span style="cursor: pointer;">✕</span>';
    
    // Messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chat-messages';
    messagesContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;

    // Input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
        padding: 12px;
        border-top: 1px solid #3d3d3d;
        display: flex;
        gap: 8px;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Send a message...';
    input.style.cssText = `
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #3d3d3d;
        border-radius: 4px;
        background: #1f1f23;
        color: white;
        outline: none;
    `;

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.style.cssText = `
        padding: 8px 16px;
        background: #9146ff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    `;

    inputArea.appendChild(input);
    inputArea.appendChild(sendButton);
    chatUI.appendChild(header);
    chatUI.appendChild(messagesContainer);
    chatUI.appendChild(inputArea);

    // Close button functionality
    header.querySelector('span:last-child').addEventListener('click', () => {
        chatUI.style.display = 'none';
    });

    return chatUI;
}

export function addChatMessage(username, message, color = '#ffffff') {
    const messagesContainer = document.querySelector('.chat-messages');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 2px;
        animation: slideIn 0.3s ease-out;
    `;

    const usernameElement = document.createElement('span');
    usernameElement.textContent = username + ':';
    usernameElement.style.cssText = `
        color: ${color};
        font-weight: bold;
        font-size: 13px;
    `;

    const textElement = document.createElement('span');
    textElement.textContent = message;
    textElement.style.cssText = `
        color: #efeff1;
        font-size: 14px;
        word-wrap: break-word;
    `;

    messageElement.appendChild(usernameElement);
    messageElement.appendChild(textElement);
    messagesContainer.appendChild(messageElement);

    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Limit messages
    while (messagesContainer.children.length > 100) {
        messagesContainer.removeChild(messagesContainer.firstChild);
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .chat-messages::-webkit-scrollbar {
        width: 8px;
    }
    
    .chat-messages::-webkit-scrollbar-track {
        background: #1f1f23;
    }
    
    .chat-messages::-webkit-scrollbar-thumb {
        background: #9146ff;
        border-radius: 4px;
    }
`;
document.head.appendChild(style);
