import { CONSTANTS } from './constants.js';
import { SettingsManager } from './settings-manager.js';
import { KeepAliveService } from './keep-alive-service.js';

// Initialize Modules
const settingsManager = new SettingsManager();
const keepAliveService = new KeepAliveService(settingsManager);

let offscreenCreating = false;
let lastHeartbeat = Date.now();
const START_TIME = Date.now();

// Logging utility to match user's preference
function log(level, message) {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[SW ${timestamp} | Uptime: ${uptime}s]`;

  if (level === 'error') {
    console.error(`❌ ${prefix} ${message}`);
  } else if (level === 'warn') {
    console.warn(`⚠️ ${prefix} ${message}`);
  } else if (level === 'critical') {
    console.error(`🔥 ${prefix} CRITICAL: ${message}`);
  } else {
    console.log(`ℹ️ ${prefix} ${message}`);
  }
}

// Initialize Extension
async function initialize() {
  log('info', '🚀 Service Worker Initializing...');
  await settingsManager.load();

  updateIcon();

  if (settingsManager.get(CONSTANTS.STORAGE.IS_ACTIVE)) {
    log('info', 'Extension is ACTIVE. Starting services...');
    keepAliveService.start();
    setupOffscreenDocument();
  } else {
    log('info', 'Extension is INACTIVE.');
  }
}

// Event Listeners
chrome.runtime.onInstalled.addListener(() => {
  log('info', 'Extension Installed/Updated');
  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  log('info', 'Browser Started');
  initialize();
});

// Alarm Listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CONSTANTS.ALARMS.KEEP_ALIVE) {
    log('info', 'Keep-alive alarm triggered');
    keepAliveService.perform();
  }
});

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender, sendResponse) {
  switch (request.action) {
    case CONSTANTS.MESSAGES.GET_SETTINGS:
      const settings = settingsManager.getAll();
      sendResponse(settings);
      break;

    case CONSTANTS.MESSAGES.UPDATE_SETTINGS:
      await settingsManager.save(request.settings);
      updateIcon();

      if (request.settings.isActive) {
        log('info', 'Settings updated: ACTIVE');
        keepAliveService.start();
        setupOffscreenDocument();
      } else {
        log('info', 'Settings updated: INACTIVE');
        keepAliveService.stop();
        closeOffscreenDocument();
      }
      sendResponse({ success: true });
      break;

    case CONSTANTS.MESSAGES.TEST_KEEP_ALIVE:
      log('info', 'Manual test requested');
      const result = await keepAliveService.perform();
      sendResponse({ success: true, ...result });
      break;

    case CONSTANTS.MESSAGES.KEEP_SERVICE_WORKER_ALIVE:
      lastHeartbeat = Date.now();
      sendResponse({ status: 'alive', timestamp: Date.now() });
      break;

    case 'keepServiceWorkerAlive': // Fallback for offscreen
      lastHeartbeat = Date.now();
      sendResponse({ status: 'alive', timestamp: Date.now() });
      break;
  }
}

// Icon Updater
function updateIcon() {
  const isActive = settingsManager.get(CONSTANTS.STORAGE.IS_ACTIVE);
  const method = settingsManager.get(CONSTANTS.STORAGE.KEEP_ALIVE_METHOD);
  const interval = settingsManager.get(CONSTANTS.STORAGE.REFRESH_INTERVAL);

  const iconPath = isActive ? {
    "16": "icons/icon-active.png",
    "48": "icons/icon-active.png",
    "128": "icons/icon-active.png"
  } : {
    "16": "icons/icon-inactive.png",
    "48": "icons/icon-inactive.png",
    "128": "icons/icon-inactive.png"
  };

  chrome.action.setIcon({ path: iconPath }).catch((err) => {
    log('warn', `Could not update icon: ${err.message}`);
  });

  const title = isActive ?
    `Keep Logged In - ACTIVE (${method} every ${interval}min)` :
    'Keep Logged In - INACTIVE';
  chrome.action.setTitle({ title });
}

// Offscreen Document Management
async function setupOffscreenDocument() {
  if (offscreenCreating) return;

  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length > 0) {
      log('info', 'Offscreen document already exists.');
      return;
    }

    log('info', 'Creating offscreen document...');
    offscreenCreating = true;
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Keep service worker alive'
    });
    log('info', 'Offscreen document created successfully.');

    // Reset heartbeat on creation
    lastHeartbeat = Date.now();

  } catch (err) {
    log('error', `Offscreen creation failed: ${err.message}`);
  } finally {
    offscreenCreating = false;
  }
}

async function closeOffscreenDocument() {
  try {
    log('info', 'Closing offscreen document...');
    await chrome.offscreen.closeDocument();
    log('info', 'Offscreen document closed.');
  } catch (err) {
    // Ignore if not exists
  }
}

// Keep Alive Connection from Offscreen
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'keep-alive') {
    log('info', 'Offscreen connected via port');

    port.onMessage.addListener((msg) => {
      if (msg.type === 'keep-alive-ping') {
        lastHeartbeat = Date.now();
        port.postMessage({ type: 'pong', timestamp: Date.now() });
      }
    });

    port.onDisconnect.addListener(() => {
      log('warn', 'Offscreen port disconnected!');
    });
  }
});

// Heartbeat Monitor
setInterval(async () => {
  const isActive = settingsManager.get(CONSTANTS.STORAGE.IS_ACTIVE);
  if (!isActive) return;

  const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;

  if (timeSinceLastHeartbeat > 45000) { // 45 seconds (allow some buffer over 30s)
    log('critical', `SERVICE WORKER IDLE FOR ${Math.floor(timeSinceLastHeartbeat / 1000)}s - MIGHT SHUTDOWN SOON!`);
    log('warn', 'OFFSCREEN DOCUMENT MISSING or UNRESPONSIVE! Recreating...');

    // Force recreate
    await closeOffscreenDocument();
    await setupOffscreenDocument();
    lastHeartbeat = Date.now(); // Reset to avoid loop
  } else if (timeSinceLastHeartbeat > 25000) {
    log('warn', `No heartbeat for ${Math.floor(timeSinceLastHeartbeat / 1000)}s. Checking offscreen...`);
    setupOffscreenDocument(); // Just check/create if missing
  }
}, 5000); // Check every 5 seconds
