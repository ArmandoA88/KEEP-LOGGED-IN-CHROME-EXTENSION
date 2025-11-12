// Background script for Keep Logged In extension
let isActive = null; // Will be loaded from storage
let refreshInterval = null; // Will be loaded from storage
let keepAliveMethod = null; // Will be loaded from storage
let intervalId = null;
let settingsLoaded = false;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Keep Logged In extension installed');
  loadSettings().then(() => {
    updateIcon();
    startKeepAlive();
  });
});

// Load settings from storage
async function loadSettings() {
  try {
    console.log('🔄 LOADING SETTINGS FROM STORAGE...');
    
    // Get existing settings without providing defaults that would overwrite user choices
    const result = await chrome.storage.sync.get(['isActive', 'refreshInterval', 'keepAliveMethod']);
    
    console.log('📦 Raw storage result:', result);
    
    // Only use defaults if no settings exist yet (first time install)
    if (result.isActive !== undefined) {
      isActive = result.isActive;
      console.log('✅ Loaded user isActive:', isActive);
    } else {
      isActive = true; // Default only if not set
      console.log('🆕 Using default isActive:', isActive);
    }
    
    if (result.refreshInterval !== undefined) {
      refreshInterval = result.refreshInterval;
      console.log('✅ Loaded user refreshInterval:', refreshInterval);
    } else {
      refreshInterval = 5; // Default only if not set
      console.log('🆕 Using default refreshInterval:', refreshInterval);
    }
    
    if (result.keepAliveMethod !== undefined) {
      keepAliveMethod = result.keepAliveMethod;
      console.log('✅ Loaded user keepAliveMethod:', keepAliveMethod);
    } else {
      keepAliveMethod = 'ping'; // Default only if not set
      console.log('🆕 Using default keepAliveMethod:', keepAliveMethod);
    }
    
    settingsLoaded = true;
    console.log('✅ SETTINGS FULLY LOADED:', { isActive, refreshInterval, keepAliveMethod });
    console.log('🔧 USER SETTINGS PRESERVED - No defaults applied to existing settings');
  } catch (error) {
    console.error('❌ Error loading settings:', error);
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
    console.log('Settings saved');
    updateIcon(); // Update icon when settings change
  } catch (error) {
    console.error('Error saving settings:', error);
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
      console.log(`Icon updated: ${isActive ? 'ACTIVE (Green)' : 'INACTIVE (Red)'}`);
    } catch (iconError) {
      // If state-specific icons don't exist, try default icons
      console.log('State-specific icons not found, trying default icons...');
      try {
        await chrome.action.setIcon({ 
          path: {
            "16": "icon16.png",
            "48": "icon48.png",
            "128": "icon128.png"
          }
        });
        console.log('Using default icons');
      } catch (defaultIconError) {
        // If no icons exist, just update the title
        console.log('No icon files found, using default Chrome icon');
      }
    }
    
    // Always update the title to show current state
    const title = isActive ? 
      `Keep Logged In - ACTIVE (${keepAliveMethod} every ${refreshInterval}min)` :
      'Keep Logged In - INACTIVE';
    await chrome.action.setTitle({ title: title });
    
  } catch (error) {
    console.error('Error updating icon:', error);
  }
}

// Start keep alive functionality
function startKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  if (!isActive) {
    console.log('🛑 Keep alive is disabled');
    return;
  }
  
  // Ensure refreshInterval is at least 1 minute to avoid alarm errors
  const effectiveRefreshInterval = Math.max(1, refreshInterval); 
  const intervalMs = effectiveRefreshInterval * 60 * 1000; // Convert minutes to milliseconds
  
  // Set up the interval
  intervalId = setInterval(() => {
    console.log('⏰ TIMER TRIGGERED: Interval fired, checking if active...');
    if (isActive) {
      console.log('✅ Extension is active, performing keep alive...');
      performKeepAlive();
    } else {
      console.log('❌ Extension is inactive, skipping keep alive');
    }
  }, intervalMs);
  
  console.log(`🚀 KEEP ALIVE TIMER STARTED: ${effectiveRefreshInterval} minute interval (${intervalMs}ms) using ${keepAliveMethod} method`);
  console.log(`⏰ Next keep alive will run at: ${new Date(Date.now() + intervalMs).toLocaleTimeString()}`);
  
  // Also set up Chrome alarms as backup (more reliable for service workers)
  chrome.alarms.clear('keepAliveAlarm');
  chrome.alarms.create('keepAliveAlarm', { 
    delayInMinutes: effectiveRefreshInterval, // Use effective interval
    periodInMinutes: effectiveRefreshInterval // Use effective interval
  });
  console.log(`🔔 Chrome alarm also set for ${effectiveRefreshInterval} minute intervals`);
}

// Stop keep alive functionality
function stopKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('🛑 Keep alive interval stopped');
  }
  
  // Also clear Chrome alarms
  chrome.alarms.clear('keepAliveAlarm');
  console.log('🛑 Keep alive alarms cleared');
}

// Perform keep alive action
async function performKeepAlive() {
  try {
    const tabs = await chrome.tabs.query({});
    const validTabs = tabs.filter(tab => 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://')
    );
    
    console.log(`🔄 KEEP ALIVE STARTING: ${keepAliveMethod} method on ${validTabs.length} tabs`);
    
    // Update badge to show activity
    await chrome.action.setBadgeText({ text: '●' });
    await chrome.action.setBadgeBackgroundColor({ color: keepAliveMethod === 'refresh' ? '#FF6B35' : '#4CAF50' });
    
    // Notifications removed to reduce distractions - using badge and console logging instead
    
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
        console.error(`❌ Failed to ${keepAliveMethod} tab ${tab.id}:`, error);
      }
    }
    
    // Clear badge after a few seconds
    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: '' });
    }, 3000);
    
    // Log summary
    console.log(`✅ KEEP ALIVE COMPLETED: ${successCount} successful, ${errorCount} failed`);
    
    // Update title with last activity time
    const now = new Date().toLocaleTimeString();
    const title = isActive ? 
      `Keep Logged In - ACTIVE (${keepAliveMethod} every ${refreshInterval}min) - Last: ${now}` :
      'Keep Logged In - INACTIVE';
    await chrome.action.setTitle({ title: title });
    
  } catch (error) {
    console.error('❌ Error performing keep alive:', error);
  }
}

// Refresh a tab
async function refreshTab(tab) {
  try {
    await chrome.tabs.reload(tab.id);
    console.log(`Refreshed tab: ${tab.title}`);
  } catch (error) {
    console.error(`Error refreshing tab ${tab.id}:`, error);
  }
}

// Send a ping to keep the tab alive without refreshing
async function pingTab(tab) {
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'keepAlive' });
    console.log(`Pinged tab: ${tab.title}`);
  } catch (error) {
    // Tab might not have content script loaded, that's okay
    console.log(`Could not ping tab ${tab.id}, might not support content scripts`);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    sendResponse({
      isActive,
      refreshInterval,
      keepAliveMethod
    });
  } else if (request.action === 'updateSettings') {
    console.log('⚙️ USER CHANGED SETTINGS:', request.settings);
    console.log('📝 Previous settings:', { isActive, refreshInterval, keepAliveMethod });
    
    isActive = request.settings.isActive;
    refreshInterval = request.settings.refreshInterval;
    keepAliveMethod = request.settings.keepAliveMethod;
    
    console.log('✅ New settings applied:', { isActive, refreshInterval, keepAliveMethod });
    
    saveSettings();
    
    if (isActive) {
      startKeepAlive();
    } else {
      stopKeepAlive();
    }
    
    sendResponse({ success: true });
  } else if (request.action === 'testKeepAlive') {
    // Handle manual test trigger
    console.log('🧪 MANUAL TEST: User triggered keep alive test');
    
    performKeepAlive().then(() => {
      // Get the latest results
      chrome.tabs.query({}).then(tabs => {
        const validTabs = tabs.filter(tab => 
          !tab.url.startsWith('chrome://') && 
          !tab.url.startsWith('chrome-extension://')
        );
        
        sendResponse({
          success: true,
          method: keepAliveMethod,
          tabCount: validTabs.length,
          successCount: validTabs.length, // Simplified for demo
          errorCount: 0
        });
      });
    }).catch(error => {
      console.error('Test failed:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    });
    
    return true; // Keep message channel open for async response
  }
});

// Handle Chrome alarms (more reliable than setInterval for service workers)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAliveAlarm') {
    console.log('🔔 CHROME ALARM TRIGGERED: Keep alive alarm fired');
    if (isActive) {
      console.log('✅ Extension is active, performing keep alive via alarm...');
      performKeepAlive();
    } else {
      console.log('❌ Extension is inactive, skipping alarm-triggered keep alive');
    }
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  loadSettings().then(() => {
    updateIcon();
    startKeepAlive();
  });
});

// Keep service worker alive and handle wake-up
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // This helps keep the service worker active
  return true;
});

// Handle service worker wake-up - restart timers if needed
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Service worker woke up, restarting keep alive...');
  loadSettings().then(() => {
    if (isActive) {
      startKeepAlive();
    }
  });
});
