// This script runs in the offscreen document.
// It actively keeps the service worker alive by maintaining a persistent connection
// and periodically pinging the background service worker.

// console.log('🚀 [OFFSCREEN] Script loaded at:', new Date().toLocaleTimeString());

let port = null;
let keepAliveInterval = null;
let pingCount = 0;

// Initialize everything
async function initialize() {
  try {
    await setupSilentAudio();
    connectToServiceWorker();
    startKeepAlivePing();
    // console.log('✅ [OFFSCREEN] Initialization complete');
  } catch (err) {
    console.error('❌ [OFFSCREEN] Initialization failed:', err);
  }
}

// Setup continuous silent audio to keep the document active
async function setupSilentAudio() {
  try {
    const audioContext = new AudioContext();

    // Use an oscillator for continuous playback
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 440; // 440Hz

    // Mute it completely
    gainNode.gain.value = 0;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    // console.log('🔊 [OFFSCREEN] Silent audio oscillator started');

    // Resume context if suspended (browser policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      // console.log('🔊 [OFFSCREEN] AudioContext resumed');
    }

    // Monitor state
    audioContext.onstatechange = () => {
      // console.log(`🔊 [OFFSCREEN] AudioContext state: ${audioContext.state}`);
    };

  } catch (err) {
    console.error('❌ [OFFSCREEN] Audio setup failed:', err);
  }
}

function connectToServiceWorker() {
  if (port) return;

  try {
    // console.log('🔌 [OFFSCREEN] Connecting to Service Worker...');
    port = chrome.runtime.connect({ name: 'keep-alive' });

    port.onDisconnect.addListener(() => {
      console.warn('⚠️ [OFFSCREEN] Port disconnected. Reconnecting...');
      port = null;
      setTimeout(connectToServiceWorker, 1000);
    });

    port.onMessage.addListener((msg) => {
      if (msg.type === 'pong') {
        // Connection is alive
      }
    });

  } catch (err) {
    console.error('❌ [OFFSCREEN] Connection failed:', err);
    setTimeout(connectToServiceWorker, 1000);
  }
}

function startKeepAlivePing() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);

  // Ping every 10 seconds to be safe (SW idle timeout is ~30s)
  keepAliveInterval = setInterval(() => {
    pingCount++;

    // Method 1: Port
    if (port) {
      try {
        port.postMessage({ type: 'keep-alive-ping', count: pingCount });
      } catch (err) {
        console.warn('⚠️ [OFFSCREEN] Port postMessage failed:', err);
        port = null;
        connectToServiceWorker();
      }
    } else {
      connectToServiceWorker();
    }

    // Method 2: Runtime Message (Backup)
    chrome.runtime.sendMessage({ action: 'keepServiceWorkerAlive', count: pingCount })
      .catch(err => {
        // Ignore errors, SW might be waking up
      });

  }, 10000);
}

// Start immediately
initialize();

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    connectToServiceWorker();
  }
});
