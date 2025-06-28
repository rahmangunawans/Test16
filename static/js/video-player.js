// Video Player functionality for AniFlix

let player;
let episodeData;
let watchProgressInterval;
let hasShownUpgradePrompt = false;

function initializeVideoPlayer(data) {
    episodeData = data;
    
    // Initialize Video.js player
    player = videojs('video-player', {
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        controls: true,
        preload: 'metadata',
        html5: {
            vhs: {
                overrideNative: !videojs.browser.IS_SAFARI
            }
        }
    });

    // Set up event listeners
    setupPlayerEvents();
    
    // Resume from last position if available
    if (episodeData.resumeTime > 0) {
        player.ready(() => {
            player.currentTime(episodeData.resumeTime);
            showNotification('Resumed from where you left off', 'info');
        });
    }
    
    // Start progress tracking
    startProgressTracking();
    
    console.log('Video player initialized with episode data:', episodeData);
}

function setupPlayerEvents() {
    // Player ready event
    player.ready(function() {
        console.log('Player ready');
        
        // Add custom controls for VIP features
        if (episodeData.canWatchFull) {
            addVipControls();
        }
        
        // Set up time restrictions for free users
        if (!episodeData.canWatchFull && episodeData.maxWatchTime) {
            setupTimeRestrictions();
        }
    });

    // Play event
    player.on('play', function() {
        console.log('Video started playing');
        startProgressTracking();
    });

    // Pause event
    player.on('pause', function() {
        console.log('Video paused');
        saveProgress();
    });

    // Time update event
    player.on('timeupdate', function() {
        checkTimeRestrictions();
    });

    // Ended event
    player.on('ended', function() {
        console.log('Video ended');
        markAsCompleted();
        saveProgress();
        showNextEpisodePrompt();
    });

    // Error handling
    player.on('error', function() {
        const error = player.error();
        console.error('Video player error:', error);
        showNotification('Video playback error. Please try refreshing the page.', 'error');
    });

    // Loading events
    player.on('loadstart', function() {
        console.log('Video loading started');
    });

    player.on('canplay', function() {
        console.log('Video can start playing');
    });

    // Volume change
    player.on('volumechange', function() {
        localStorage.setItem('aniflix_volume', player.volume());
        localStorage.setItem('aniflix_muted', player.muted());
    });

    // Restore volume settings
    const savedVolume = localStorage.getItem('aniflix_volume');
    const savedMuted = localStorage.getItem('aniflix_muted');
    
    if (savedVolume !== null) {
        player.volume(parseFloat(savedVolume));
    }
    if (savedMuted !== null) {
        player.muted(savedMuted === 'true');
    }
}

function setupTimeRestrictions() {
    if (!episodeData.maxWatchTime) return;
    
    const maxSeconds = episodeData.maxWatchTime * 60; // Convert minutes to seconds
    
    console.log(`Setting up time restriction: ${episodeData.maxWatchTime} minutes (${maxSeconds} seconds)`);
    
    // Add warning overlay near the time limit
    const warningTime = Math.max(maxSeconds - 60, maxSeconds * 0.8); // 1 minute before or 80% of max time
    
    player.on('timeupdate', function() {
        const currentTime = player.currentTime();
        
        // Show warning
        if (currentTime >= warningTime && currentTime < maxSeconds && !hasShownUpgradePrompt) {
            showTimeWarning(Math.ceil(maxSeconds - currentTime));
        }
        
        // Enforce time limit
        if (currentTime >= maxSeconds) {
            enforceTimeLimit();
        }
    });
}

function checkTimeRestrictions() {
    if (!episodeData.maxWatchTime || episodeData.canWatchFull) return;
    
    const currentTime = player.currentTime();
    const maxSeconds = episodeData.maxWatchTime * 60;
    
    if (currentTime >= maxSeconds && !hasShownUpgradePrompt) {
        enforceTimeLimit();
    }
}

function showTimeWarning(secondsLeft) {
    const minutes = Math.ceil(secondsLeft / 60);
    showNotification(
        `Free preview ending in ${minutes} minute${minutes !== 1 ? 's' : ''}. Upgrade to VIP to continue watching!`,
        'warning'
    );
}

function enforceTimeLimit() {
    if (hasShownUpgradePrompt) return;
    
    hasShownUpgradePrompt = true;
    
    // Pause the video
    player.pause();
    
    // Show upgrade overlay
    const overlay = document.getElementById('upgrade-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }
    
    // Save progress before stopping
    saveProgress();
    
    console.log('Time limit reached, showing upgrade prompt');
}

function restartVideo() {
    const overlay = document.getElementById('upgrade-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }
    
    // Reset video to beginning
    player.currentTime(0);
    hasShownUpgradePrompt = false;
    
    console.log('Video restarted');
}

function addVipControls() {
    // Add quality selector for VIP users
    if (player.qualityLevels) {
        const qualityLevels = player.qualityLevels();
        
        if (qualityLevels.length > 1) {
            // Quality selector would be added here
            console.log('Multiple quality levels available for VIP user');
        }
    }
    
    // Add download button for VIP users
    const controlBar = player.getChild('ControlBar');
    if (controlBar) {
        // Download button implementation would go here
        console.log('VIP controls added');
    }
}

function startProgressTracking() {
    // Clear existing interval
    if (watchProgressInterval) {
        clearInterval(watchProgressInterval);
    }
    
    // Track progress every 10 seconds while playing
    watchProgressInterval = setInterval(() => {
        if (!player.paused() && !player.ended()) {
            saveProgress();
        }
    }, 10000);
}

function saveProgress() {
    if (!player || !episodeData) return;
    
    const currentTime = Math.floor(player.currentTime());
    const duration = Math.floor(player.duration() || 0);
    const completed = currentTime >= duration * 0.9; // Consider 90% as completed
    
    // Check if we're within time limits for free users
    if (!episodeData.canWatchFull && episodeData.maxWatchTime) {
        const maxSeconds = episodeData.maxWatchTime * 60;
        if (currentTime > maxSeconds) {
            return; // Don't save progress beyond the limit
        }
    }
    
    // Update progress via the global function from app.js
    if (window.AniFlix && window.AniFlix.updateWatchProgress) {
        window.AniFlix.updateWatchProgress(episodeData.id, currentTime, completed);
    }
    
    console.log(`Progress saved: ${currentTime}s / ${duration}s, completed: ${completed}`);
}

function markAsCompleted() {
    if (!player || !episodeData) return;
    
    const duration = Math.floor(player.duration() || 0);
    
    if (window.AniFlix && window.AniFlix.updateWatchProgress) {
        window.AniFlix.updateWatchProgress(episodeData.id, duration, true);
    }
    
    console.log('Episode marked as completed');
}

function showNextEpisodePrompt() {
    // Create next episode prompt
    const promptDiv = document.createElement('div');
    promptDiv.className = 'fixed bottom-4 right-4 bg-gray-800 border border-red-500 rounded-lg p-4 z-50 max-w-sm';
    promptDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h4 class="text-white font-semibold">Episode Complete!</h4>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-white">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <p class="text-gray-300 text-sm mb-3">Ready for the next episode?</p>
        <div class="flex space-x-2">
            <button onclick="goToNextEpisode()" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                Next Episode
            </button>
            <button onclick="this.parentElement.parentElement.remove()" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm">
                Stay Here
            </button>
        </div>
    `;
    
    document.body.appendChild(promptDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (promptDiv.parentNode) {
            promptDiv.remove();
        }
    }, 10000);
}

function goToNextEpisode() {
    // This would navigate to the next episode
    // Implementation would depend on the episode list structure
    console.log('Navigate to next episode');
    
    // For now, just refresh to episode list
    const episodeList = document.querySelector('.space-y-2');
    if (episodeList) {
        const currentEpisodeElement = episodeList.querySelector('.bg-red-600');
        if (currentEpisodeElement) {
            const nextEpisode = currentEpisodeElement.nextElementSibling;
            if (nextEpisode) {
                const nextLink = nextEpisode.querySelector('a');
                if (nextLink) {
                    window.location.href = nextLink.href;
                }
            }
        }
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (!player) return;
    
    // Only handle shortcuts when video player is in focus or no input is focused
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
    }
    
    switch(e.key) {
        case ' ':
        case 'k':
            e.preventDefault();
            if (player.paused()) {
                player.play();
            } else {
                player.pause();
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            player.currentTime(Math.max(0, player.currentTime() - 10));
            break;
        case 'ArrowRight':
            e.preventDefault();
            const maxTime = episodeData.maxWatchTime && !episodeData.canWatchFull 
                ? episodeData.maxWatchTime * 60 
                : player.duration();
            player.currentTime(Math.min(maxTime, player.currentTime() + 10));
            break;
        case 'ArrowUp':
            e.preventDefault();
            player.volume(Math.min(1, player.volume() + 0.1));
            break;
        case 'ArrowDown':
            e.preventDefault();
            player.volume(Math.max(0, player.volume() - 0.1));
            break;
        case 'm':
            e.preventDefault();
            player.muted(!player.muted());
            break;
        case 'f':
            e.preventDefault();
            if (player.isFullscreen()) {
                player.exitFullscreen();
            } else {
                player.requestFullscreen();
            }
            break;
    }
});

// Cleanup when leaving the page
window.addEventListener('beforeunload', function() {
    if (watchProgressInterval) {
        clearInterval(watchProgressInterval);
    }
    
    if (player && !player.paused()) {
        saveProgress();
    }
});

// Show notification function (using the one from app.js if available)
function showNotification(message, type) {
    if (window.AniFlix && window.AniFlix.showNotification) {
        window.AniFlix.showNotification(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Export functions for global use
window.initializeVideoPlayer = initializeVideoPlayer;
window.restartVideo = restartVideo;
window.goToNextEpisode = goToNextEpisode;
