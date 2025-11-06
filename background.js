// Background script for Keep Logged In extension
let isActive = null; // Will be loaded from storage
let refreshInterval = null; // Will be loaded from storage
let keepAliveMethod = null; // Will be loaded from storage
let settingsLoaded = false;
let offscreenCreating = false; // To prevent multiple offscreen document creations

// Diagnostic tracking
let serviceWorkerStartTime = Date.now();
let totalMessages = 0;
let totalAlarms = 0;
let lastActivityTime = Date.now();

// Enhanced logging function
function log(level, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  const uptime = Math.floor((Date.now() - serviceWorkerStartTime) / 1000);
  const prefix = `[SW ${timestamp} | Uptime: ${uptime}s]`;
  
  lastActivityTime = Date.now();
  
  if (level === 'error') {
    console.error(`❌ ${prefix} ${message}`, data || '');
  } else if (level === 'warn') {
    console.warn(`⚠️ ${prefix} ${message}`, data || '');
  } else if (level === 'success') {
    console.log(`✅ ${prefix} ${message}`, data || '');
  } else if (level === 'critical') {
    console.error(`🔥 ${prefix} CRITICAL: ${message}`, data || '');
  } else {
    console.log(`💬 ${prefix} ${message}`, data || '');
  }
}

log('success', '🚀 SERVICE WORKER STARTED!');
log('info', `Start time: ${new Date(serviceWorkerStartTime).toLocaleTimeString()}`);

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  log('success', 'Keep Logged In extension installed/updated');
  isActive = true; // Force active on install
  saveSettings(); // Persist the active state
  loadSettings().then(() => {
    updateIcon();
    startKeepAlive();
    setupOffscreenDocument(); // Always setup offscreen document on install
  });
});

// Load settings from storage
async function loadSettings() {
  try {
    log('info', '🔄 LOADING SETTINGS FROM STORAGE...');
    
    // Get existing settings without providing defaults that would overwrite user choices
    const result = await chrome.storage.sync.get(['isActive', 'refreshInterval', 'keepAliveMethod']);
    
    log('info', '📦 Raw storage result:', result);
    
    // Only use defaults if no settings exist yet (first time install)
    if (result.isActive !== undefined) {
      isActive = result.isActive;
      log('success', 'Loaded user isActive:', isActive);
    } else {
      isActive = true; // Default only if not set
      log('info', 'Using default isActive:', isActive);
    }
    
    if (result.refreshInterval !== undefined) {
      refreshInterval = result.refreshInterval;
      log('success', 'Loaded user refreshInterval:', refreshInterval);
    } else {
      refreshInterval = 4; // Default only if not set
      log('info', 'Using default refreshInterval:', refreshInterval);
    }
    
    if (result.keepAliveMethod !== undefined) {
      keepAliveMethod = result.keepAliveMethod;
      log('success', 'Loaded user keepAliveMethod:', keepAliveMethod);
    } else {
      keepAliveMethod = 'ping'; // Default only if not set
      log('info', 'Using default keepAliveMethod:', keepAliveMethod);
    }
    
    settingsLoaded = true;
    log('success', '✅ SETTINGS FULLY LOADED:', { isActive, refreshInterval, keepAliveMethod });
  } catch (error) {
    log('error', 'Error loading settings:', error.message);
    settingsLoaded = false;
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    await chrome.storage.sync.set({
      isActive,
      refreshInterval,
      keepAliveMethod
    });
    log('success', 'Settings saved successfully');
    updateIcon(); // Update icon when settings change
  } catch (error) {
    log('error', 'Error saving settings:', error.message);
  }
}

// Update extension icon based on active state
async function updateIcon() {
  try {
    // Try to use state-specific icons first
    const iconPath = isActive ? {
      "16": "icon16-active.png",
      "48": "icon48-active.png", 
      "128": "icon128-active.png"
    } : {
      "16": "icon16-inactive.png",
      "48": "icon48-inactive.png",
      "128": "icon128-inactive.png"
    };
    
    try {
      await chrome.action.setIcon({ path: iconPath });
      log('success', `Icon updated: ${isActive ? 'ACTIVE (Green)' : 'INACTIVE (Red)'}`);
    } catch (iconError) {
      log('warn', 'State-specific icons not found, trying default icons...');
      try {
        await chrome.action.setIcon({ 
          path: {
            "16": "icon16.png",
            "48": "icon48.png",
            "128": "icon128.png"
          }
        });
        log('info', 'Using default icons');
      } catch (defaultIconError) {
        log('warn', 'No icon files found, using default Chrome icon');
      }
    }
    
    // Always update the title to show current state
    const title = isActive ? 
      `Keep Logged In - ACTIVE (${keepAliveMethod} every ${refreshInterval}min)` :
      'Keep Logged In - INACTIVE';
    await chrome.action.setTitle({ title: title });
    
  } catch (error) {
    log('error', 'Error updating icon:', error.message);
  }
}

// Start keep alive functionality
function startKeepAlive() {
  if (!isActive) {
    log('warn', '🛑 Keep alive is disabled');
    chrome.alarms.clear('keepAliveAlarm');
    return;
  }
  
  // Ensure refreshInterval is at least 1 minute to avoid alarm errors
  const effectiveRefreshInterval = Math.max(1, refreshInterval); 
  
  chrome.alarms.clear('keepAliveAlarm');
  chrome.alarms.create('keepAliveAlarm', { 
    delayInMinutes: effectiveRefreshInterval,
    periodInMinutes: effectiveRefreshInterval
  });
  log('success', `🔔 Chrome alarm set for ${effectiveRefreshInterval} minute intervals`);
}

// Stop keep alive functionality
function stopKeepAlive() {
  chrome.alarms.clear('keepAliveAlarm');
  log('warn', '🛑 Keep alive alarms cleared');
}

// Perform keep alive action
async function performKeepAlive() {
  try {
    log('info', '🔄 KEEP ALIVE STARTING...');
    
    const tabs = await chrome.tabs.query({});
    const validTabs = tabs.filter(tab => 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://')
    );
    
    log('info', `Processing ${validTabs.length} tabs using ${keepAliveMethod} method`);
    
    // Update badge to show activity
    await chrome.action.setBadgeText({ text: '●' });
    await chrome.action.setBadgeBackgroundColor({ color: keepAliveMethod === 'refresh' ? '#FF6B35' : '#4CAF50' });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const tab of validTabs) {
      try {
        if (keepAliveMethod === 'refresh') {
          await refreshTab(tab);
          successCount++;
        } else if (keepAliveMethod === 'ping') {
          await pingTab(tab);
          successCount++;
        }
      } catch (error) {
        errorCount++;
        log('error', `Failed to ${keepAliveMethod} tab ${tab.id}:`, error.message);
      }
    }
    
    // Clear badge after a few seconds
    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: '' });
    }, 3000);
    
    log('success', `✅ KEEP ALIVE COMPLETED: ${successCount} successful, ${errorCount} failed`);
    
    // Update title with last activity time
    const now = new Date().toLocaleTimeString();
    const title = isActive ? 
      `Keep Logged In - ACTIVE (${keepAliveMethod} every ${refreshInterval}min) - Last: ${now}` :
      'Keep Logged In - INACTIVE';
    await chrome.action.setTitle({ title: title });
    
  } catch (error) {
    log('error', 'Error performing keep alive:', error.message);
  }
}

// Refresh a tab
async function refreshTab(tab) {
  try {
    await chrome.tabs.reload(tab.id);
    log('info', `Refreshed tab: ${tab.title}`);
  } catch (error) {
    log('error', `Error refreshing tab ${tab.id}:`, error.message);
  }
}

// Send a ping to keep the tab alive without refreshing
async function pingTab(tab) {
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'keepAlive' });
    log('info', `Pinged tab: ${tab.title}`);
  } catch (error) {
    log('warn', `Could not ping tab ${tab.id}, might not support content scripts`);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  totalMessages++;
  
  if (request.action === 'getSettings') {
    log('info', 'Popup requested settings');
    sendResponse({
      isActive,
      refreshInterval,
      keepAliveMethod
    });
  } else if (request.action === 'updateSettings') {
    log('info', '⚙️ USER CHANGED SETTINGS:', request.settings);
    
    isActive = request.settings.isActive;
    refreshInterval = request.settings.refreshInterval;
    keepAliveMethod = request.settings.keepAliveMethod;
    
    log('success', '✅ New settings applied:', { isActive, refreshInterval, keepAliveMethod });
    
    saveSettings();
    
    if (isActive) {
      startKeepAlive();
      setupOffscreenDocument();
    } else {
      stopKeepAlive();
      closeOffscreenDocument();
    }
    
    sendResponse({ success: true });
  } else if (request.action === 'testKeepAlive') {
    log('info', '🧪 MANUAL TEST triggered by user');
    
    performKeepAlive().then(() => {
      chrome.tabs.query({}).then(tabs => {
        const validTabs = tabs.filter(tab => 
          !tab.url.startsWith('chrome://') && 
          !tab.url.startsWith('chrome-extension://')
        );
        
        sendResponse({
          success: true,
          method: keepAliveMethod,
          tabCount: validTabs.length,
          successCount: validTabs.length,
          errorCount: 0
        });
      });
    }).catch(error => {
      log('error', 'Test failed:', error.message);
      sendResponse({
        success: false,
        error: error.message
      });
    });
    
    return true;
  }
});

// Handle Chrome alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  totalAlarms++;
  
  if (alarm.name === 'keepAliveAlarm') {
    log('success', `🔔 CHROME ALARM TRIGGERED (alarm #${totalAlarms})`);
    if (isActive) {
      log('info', 'Extension is active, performing keep alive...');
      performKeepAlive();
    } else {
      log('warn', 'Extension is inactive, skipping alarm-triggered keep alive');
    }
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  log('success', '🔄 Chrome browser started, service worker initializing...');
  serviceWorkerStartTime = Date.now();
  isActive = true;
  saveSettings();
  loadSettings().then(() => {
    updateIcon();
    startKeepAlive();
    setupOffscreenDocument();
  });
});

// Handle persistent connections from offscreen document
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'keep-alive') {
    log('success', '🔌 Persistent connection ESTABLISHED from offscreen document');
    
    port.onMessage.addListener((message) => {
      totalMessages++;
      
      if (message.type === 'keep-alive-ping') {
        log('success', `💓 Keep-alive ping #${message.attempt} received from offscreen (uptime: ${Math.floor((Date.now() - serviceWorkerStartTime) / 1000)}s)`);
        
        // Send pong response
        try {
          port.postMessage({ type: 'pong', timestamp: Date.now() });
          log('success', 'Sent pong response to offscreen');
        } catch (error) {
          log('error', 'Failed to send pong response:', error.message);
        }
      }
    });
    
    port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      log('error', '🔌 Offscreen connection DISCONNECTED', error ? error.message : 'No error details');
    });
  }
});

// Keep service worker alive with message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  totalMessages++;
  
  // Handle keep-alive pings from offscreen document
  if (message.action === 'keepServiceWorkerAlive') {
    const uptime = Math.floor((Date.now() - serviceWorkerStartTime) / 1000);
    log('success', `💓 Runtime keep-alive ping #${message.attempt} (uptime: ${uptime}s, total messages: ${totalMessages})`);
    sendResponse({ status: 'alive', timestamp: Date.now(), uptime: uptime, totalMessages: totalMessages });
    return true;
  }
  
  return true;
});

// Monitor tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isActive) {
    log('info', `Tab updated: ${tab.title}`);
  }
});

// Monitor tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  log('info', `Tab activated: ${activeInfo.tabId}`);
});

// Offscreen document management
async function setupOffscreenDocument() {
  if (offscreenCreating) {
    log('warn', 'Offscreen document creation already in progress');
    return;
  }
  
  try {
    log('info', 'Checking for existing offscreen document...');
    
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length > 0) {
      log('success', 'Offscreen document already exists');
      return;
    }

    log('info', 'Creating new offscreen document...');
    offscreenCreating = true;
    
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Keep the service worker alive for periodic tasks and prevent extension timeout.'
    });
    
    log('success', '✅ Offscreen document created successfully - Service worker will stay alive!');
    
  } catch (err) {
    log('error', 'Failed to create offscreen document:', err.message);
    
    // Retry after a delay
    setTimeout(() => {
      log('warn', 'Retrying offscreen document creation...');
      offscreenCreating = false;
      setupOffscreenDocument();
    }, 5000);
  } finally {
    offscreenCreating = false;
  }
}

// Periodic health check for offscreen document
setInterval(async () => {
  try {
    const uptime = Math.floor((Date.now() - serviceWorkerStartTime) / 1000);
    const idleTime = Math.floor((Date.now() - lastActivityTime) / 1000);
    
    log('info', `🏥 SERVICE WORKER HEALTH CHECK`);
    log('info', `   - Uptime: ${uptime}s`);
    log('info', `   - Idle Time: ${idleTime}s`);
    log('info', `   - Total Messages: ${totalMessages}`);
    log('info', `   - Total Alarms: ${totalAlarms}`);
    log('info', `   - Active: ${isActive}`);
    
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length === 0 && isActive) {
      log('error', '⚠️ OFFSCREEN DOCUMENT MISSING! Recreating...');
      await setupOffscreenDocument();
    } else {
      log('success', `Offscreen document status: ${existingContexts.length > 0 ? 'ACTIVE' : 'NOT CREATED'}`);
    }
  } catch (err) {
    log('error', 'Error in health check:', err.message);
  }
}, 30000); // Every 30 seconds

async function closeOffscreenDocument() {
  try {
    log('info', 'Attempting to close offscreen document...');
    
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length === 0) {
      log('info', 'No offscreen document to close');
      return;
    }

    await chrome.offscreen.closeDocument();
    log('success', 'Offscreen document closed');
  } catch (err) {
    log('error', 'Failed to close offscreen document:', err.message);
  }
}

// Log when service worker might be shutting down
let shutdownTimer;
function resetShutdownTimer() {
  if (shutdownTimer) clearTimeout(shutdownTimer);
  
  shutdownTimer = setTimeout(() => {
    log('critical', '⛔ SERVICE WORKER IDLE FOR 25+ SECONDS - MIGHT SHUTDOWN SOON!');
    log('critical', 'If you see this message, the keep-alive mechanism is failing!');
  }, 25000);
}

// Reset timer on any activity
resetShutdownTimer();
chrome.runtime.onMessage.addListener(() => {
  resetShutdownTimer();
  return true;
});

log('success', '🎯 Background service worker fully initialized and ready!');
log('info', `Settings loaded status: ${settingsLoaded}`);
log('info', 'Starting settings load...');

// Load settings on startup
loadSettings().then(() => {
  updateIcon();
  if (isActive) {
    startKeepAlive();
    setupOffscreenDocument();
  }
});
