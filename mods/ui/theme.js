/**
 * Twitch Theme
 * Applies Twitch-themed styling to the interface
 */

export function applyTwitchTheme() {
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --twitch-purple: #9146ff;
            --twitch-dark: #0e0e10;
            --twitch-gray: #18181b;
            --twitch-light: #efeff1;
        }
        
        body {
            background: var(--twitch-dark) !important;
        }
        
        .twitch-themed {
            --primary-color: var(--twitch-purple);
            --background-color: var(--twitch-dark);
            --text-color: var(--twitch-light);
        }
    `;
    if (document.head) {
        document.head.appendChild(style);
    }
    console.log('[TizenTwitch] Twitch theme applied');
}

// Apply theme on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTwitchTheme);
} else {
    applyTwitchTheme();
}
