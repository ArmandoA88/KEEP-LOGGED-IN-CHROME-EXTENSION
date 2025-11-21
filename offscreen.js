// This script runs in the offscreen document.
// It actively keeps the service worker alive by maintaining a persistent connection
// and periodically pinging the background service worker.

console.log('🚀 [OFFSCREEN] Script loaded at:', new Date().toLocaleTimeString());
console.log('🚀 [OFFSCREEN] Document URL:', window.location.href);

// Maintain a persistent connection to keep the service worker alive
let port = null;
let keepAliveInterval = null;
let consecutiveErrors = 0;
let lastSuccessfulPing = Date.now();
let pingAttempts = 0;
let successfulPings = 0;
let failedPings = 0;

// Detailed logging function
function log(level, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[OFFSCREEN ${timestamp}]`;
  
  if (level === 'error') {
    console.error(`❌ ${prefix} ${message}`, data || '');
  } else if (level === 'warn') {
    console.warn(`⚠️ ${prefix} ${message}`, data || '');
  } else if (level === 'success') {
    console.log(`✅ ${prefix} ${message}`, data || '');
  } else {
    console.log(`💬 ${prefix} ${message}`, data || '');
  }
}

function connectToServiceWorker() {
  try {
    log('info', 'Attempting to connect to service worker...');
    
    // Create a persistent connection
    port = chrome.runtime.connect({ name: 'keep-alive' });
    
    port.onMessage.addListener((message) => {
      log('success', 'Received message from service worker:', message);
      if (message.type === 'pong') {
        successfulPings++;
        lastSuccessfulPing = Date.now();
        consecutiveErrors = 0;
        log('success', `Pong received! Success rate: ${successfulPings}/${pingAttempts}`);
      }
    });
    
    port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      log('error', 'Port disconnected!', error ? error.message : 'No error details');
      log('warn', `Reconnecting in 1 second... (consecutive errors: ${++consecutiveErrors})`);
      port = null;
      setTimeout(connectToServiceWorker, 1000);
    });
    
    log('success', 'Connected to service worker successfully');
  } catch (error) {
    log('error', 'Failed to connect to service worker:', error.message);
    log('warn', 'Retrying connection in 1 second...');
    setTimeout(connectToServiceWorker, 1000);
  }
}

// Send periodic pings to keep the service worker active
function startKeepAlivePing() {
  if (keepAliveInterval) {
    log('warn', 'Clearing existing keep-alive interval');
    clearInterval(keepAliveInterval);
  }
  
  log('info', 'Starting keep-alive ping mechanism (every 20 seconds)');
  
  // Ping every 20 seconds (well before the 30-second timeout)
  keepAliveInterval = setInterval(() => {
    pingAttempts++;
    const timeSinceLastSuccess = Date.now() - lastSuccessfulPing;
    
    log('info', `Keep-alive ping #${pingAttempts} (${Math.floor(timeSinceLastSuccess/1000)}s since last success)`);
    
    try {
      // Method 1: Port message
      if (port) {
        try {
          port.postMessage({ type: 'keep-alive-ping', timestamp: Date.now(), attempt: pingAttempts });
          log('info', 'Sent port message to service worker');
        } catch (portError) {
          log('error', 'Port message failed:', portError.message);
          failedPings++;
          port = null;
          connectToServiceWorker();
        }
      } else {
        log('warn', 'Port is null, attempting to reconnect...');
        connectToServiceWorker();
      }
      
      // Method 2: Runtime message (backup)
      chrome.runtime.sendMessage({ action: 'keepServiceWorkerAlive', timestamp: Date.now(), attempt: pingAttempts }, (response) => {
        if (chrome.runtime.lastError) {
          log('error', 'Runtime message failed:', chrome.runtime.lastError.message);
          failedPings++;
          log('warn', `Failure rate: ${failedPings}/${pingAttempts} pings failed`);
        } else {
          log('success', 'Runtime message succeeded:', response);
          successfulPings++;
          lastSuccessfulPing = Date.now();
          consecutiveErrors = 0;
        }
      });
      
      // Log statistics every 5 pings
      if (pingAttempts % 5 === 0) {
        log('info', `📊 STATISTICS: Attempts=${pingAttempts}, Success=${successfulPings}, Failed=${failedPings}, ConsecutiveErrors=${consecutiveErrors}`);
      }
      
    } catch (error) {
      log('error', 'Critical error in ping interval:', error.message);
      consecutiveErrors++;
      
      if (consecutiveErrors > 5) {
        log('error', `⛔ TOO MANY CONSECUTIVE ERRORS (${consecutiveErrors})! Attempting full reset...`);
        consecutiveErrors = 0;
        port = null;
        connectToServiceWorker();
      }
    }
  }, 20000); // Every 20 seconds
  
  log('success', 'Keep-alive interval started successfully');
}

// Create a silent audio element to satisfy the AUDIO_PLAYBACK reason
function setupSilentAudio() {
  try {
    log('info', 'Setting up silent audio playback...');
    
    const audio = document.createElement('audio');
    audio.loop = true;
    audio.muted = true;
    
    // Create a silent audio source (1 second of silence)
    const audioContext = new AudioContext();
    log('info', `AudioContext created. State: ${audioContext.state}, Sample Rate: ${audioContext.sampleRate}`);
    
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      log('warn', 'Audio source ended unexpectedly!');
    };
    
    source.start();
    
    log('success', 'Silent audio playback started successfully');
    
    // Monitor audio context state
    audioContext.onstatechange = () => {
      if (audioContext.state === 'running') {
        log('success', `AudioContext state changed to: ${audioContext.state}`);
      } else if (audioContext.state === 'suspended' || audioContext.state === 'closed') {
        log('warn', `AudioContext state changed to: ${audioContext.state}`);
      } else {
        log('info', `AudioContext state changed to: ${audioContext.state}`);
      }
    };
    
  } catch (error) {
    log('error', 'Failed to setup silent audio:', error.message);
  }
}

// Initialize everything
function initialize() {
  log('info', '🔧 Initializing offscreen keep-alive mechanism...');
  
  try {
    // Setup silent audio to satisfy AUDIO_PLAYBACK reason
    setupSilentAudio();
    
    // Connect to service worker
    connectToServiceWorker();
    
    // Start periodic pings
    startKeepAlivePing();
    
    log('success', '✅ Offscreen keep-alive mechanism initialized successfully');
  } catch (error) {
    log('error', '⛔ CRITICAL: Initialization failed!', error.message);
  }
}

// Start initialization
log('info', 'Starting initialization in 100ms...');
setTimeout(initialize, 100);

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('info', 'Received runtime message:', message);
  
  if (message.action === 'ping') {
    log('success', 'Responding to ping from service worker');
    sendResponse({ status: 'alive', timestamp: Date.now() });
  } else if (message.action === 'diagnostics') {
    log('info', 'Diagnostics requested');
    sendResponse({
      status: 'alive',
      timestamp: Date.now(),
      stats: {
        pingAttempts,
        successfulPings,
        failedPings,
        consecutiveErrors,
        lastSuccessfulPing,
        timeSinceLastSuccess: Date.now() - lastSuccessfulPing,
        portConnected: port !== null
      }
    });
  }
  
  return true; // Keep message channel open for async response
});

// Monitor page visibility to ensure we stay active
document.addEventListener('visibilitychange', () => {
  log('warn', `Visibility changed to: ${document.visibilityState}`);
  
  if (document.visibilityState === 'visible') {
    if (!port) {
      log('warn', 'Port disconnected while hidden, reconnecting...');
      connectToServiceWorker();
    }
  }
});

// Periodic health check with detailed diagnostics
setInterval(() => {
  const timeSinceLastSuccess = Date.now() - lastSuccessfulPing;
  const healthStatus = timeSinceLastSuccess < 60000 ? 'HEALTHY' : 'DEGRADED';
  
  log('info', `🏥 HEALTH CHECK - Status: ${healthStatus}`);
  log('info', `   - Port Connected: ${port !== null}`);
  log('info', `   - Ping Attempts: ${pingAttempts}`);
  log('info', `   - Successful Pings: ${successfulPings}`);
  log('info', `   - Failed Pings: ${failedPings}`);
  log('info', `   - Consecutive Errors: ${consecutiveErrors}`);
  log('info', `   - Time Since Last Success: ${Math.floor(timeSinceLastSuccess/1000)}s`);
  
  if (timeSinceLastSuccess > 60000) {
    log('error', '⛔ WARNING: No successful ping in over 1 minute!');
    log('warn', 'Attempting reset...');
    port = null;
    connectToServiceWorker();
  }
}, 60000); // Every minute

// Error handler for unhandled errors
window.addEventListener('error', (event) => {
  log('error', '⛔ Unhandled error:', event.error ? event.error.message : event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  log('error', '⛔ Unhandled promise rejection:', event.reason);
});

log('success', '🎯 Offscreen document script fully loaded and ready!');
