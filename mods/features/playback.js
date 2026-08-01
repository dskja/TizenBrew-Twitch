/**
 * Twitch Playback Controls
 * Adds playback control functionality for Twitch streams on Tizen TVs
 * Handles media key events and provides playback state management
 */

var playbackState = {
    isPlaying: true,
    isMuted: false,
    volume: 1.0,
    quality: 'auto',
    isFullscreen: false
};

export function getPlaybackState() {
    return playbackState;
}

export function togglePlayPause() {
    var video = document.querySelector('video');
    if (!video) return;
    if (video.paused) {
        video.play();
        playbackState.isPlaying = true;
    } else {
        video.pause();
        playbackState.isPlaying = false;
    }
    console.log('[TizenTwitch] Play/Pause:', playbackState.isPlaying);
}

export function toggleMute() {
    var video = document.querySelector('video');
    if (!video) return;
    video.muted = !video.muted;
    playbackState.isMuted = video.muted;
    console.log('[TizenTwitch] Mute:', playbackState.isMuted);
}

export function setVolume(volume) {
    var video = document.querySelector('video');
    if (!video) return;
    volume = Math.max(0, Math.min(1, volume));
    video.volume = volume;
    video.muted = volume === 0;
    playbackState.volume = volume;
    playbackState.isMuted = volume === 0;
    console.log('[TizenTwitch] Volume:', volume);
}

export function seekForward(seconds) {
    var video = document.querySelector('video');
    if (!video) return;
    video.currentTime = Math.min(video.duration || 0, video.currentTime + (seconds || 10));
    console.log('[TizenTwitch] Seek forward:', seconds + 's');
}

export function seekBackward(seconds) {
    var video = document.querySelector('video');
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - (seconds || 10));
    console.log('[TizenTwitch] Seek backward:', seconds + 's');
}

export function toggleFullscreen() {
    var player = document.querySelector('[data-a-target="player-container"]') || document.querySelector('video');
    if (!player) return;
    if (!document.fullscreenElement) {
        if (player.requestFullscreen) player.requestFullscreen();
        else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen();
        playbackState.isFullscreen = true;
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        playbackState.isFullscreen = false;
    }
    console.log('[TizenTwitch] Fullscreen:', playbackState.isFullscreen);
}

export function cycleQuality() {
    var qualities = ['auto', '160p', '360p', '480p', '720p', '1080p'];
    var currentIdx = qualities.indexOf(playbackState.quality);
    var nextIdx = (currentIdx + 1) % qualities.length;
    playbackState.quality = qualities[nextIdx];
    console.log('[TizenTwitch] Quality cycled to:', playbackState.quality);
    var settingsBtn = document.querySelector('[data-a-target="player-settings-button"]');
    if (settingsBtn) {
        try { settingsBtn.click(); } catch (e) {}
    }
}

function handleKeyEvent(e) {
    switch (e.key) {
        case 'MediaPlayPause':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'MediaPlay':
            e.preventDefault();
            var video1 = document.querySelector('video');
            if (video1 && video1.paused) video1.play();
            playbackState.isPlaying = true;
            break;
        case 'MediaPause':
            e.preventDefault();
            var video2 = document.querySelector('video');
            if (video2 && !video2.paused) video2.pause();
            playbackState.isPlaying = false;
            break;
        case 'MediaStop':
            e.preventDefault();
            var video3 = document.querySelector('video');
            if (video3) { video3.pause(); video3.currentTime = 0; }
            playbackState.isPlaying = false;
            break;
        case 'MediaFastForward':
            e.preventDefault();
            seekForward(10);
            break;
        case 'MediaRewind':
            e.preventDefault();
            seekBackward(10);
            break;
        case 'MediaTrackNext':
            e.preventDefault();
            seekForward(30);
            break;
        case 'MediaTrackPrevious':
            e.preventDefault();
            seekBackward(30);
            break;
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyEvent);
}

console.log('[TizenTwitch] Playback controls initialized');
