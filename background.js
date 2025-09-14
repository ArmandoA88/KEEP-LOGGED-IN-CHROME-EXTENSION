// Background script for Keep Logged In extension
let isActive = true;
let refreshInterval = 4; // minutes
let keepAliveMethod = 'ping'; // 'refresh' or 'ping'
let intervalId = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Keep Logged In extension installed');
  loadSettings();
  startKeepAlive();
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get({
      isActive: true,
      refreshInterval: 4,
      keepAliveMethod: 'ping'
    });
    
    isActive = result.isActive;
    refreshInterval = result.refreshInterval;
    keepAliveMethod = result.keepAliveMethod;
    
    console.log('Settings loaded:', { isActive, refreshInterval, keepAliveMethod });
  } catch (error) {
    console.error('Error loading settings:', error);
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
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Start keep alive functionality
function startKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
  }
  
  if (!isActive) {
    console.log('Keep alive is disabled');
    return;
  }
  
  const intervalMs = refreshInterval * 60 * 1000; // Convert minutes to milliseconds
  
  intervalId = setInterval(() => {
    if (isActive) {
      performKeepAlive();
    }
  }, intervalMs);
  
  console.log(`Keep alive started with ${refreshInterval} minute interval using ${keepAliveMethod} method`);
}

// Stop keep alive functionality
function stopKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Keep alive stopped');
  }
}

// Perform keep alive action
async function performKeepAlive() {
  try {
    const tabs = await chrome.tabs.query({});
    console.log(`Performing keep alive for ${tabs.length} tabs`);
    
    for (const tab of tabs) {
      // Skip chrome:// and extension pages
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        continue;
      }
      
      if (keepAliveMethod === 'refresh') {
        await refreshTab(tab);
      } else if (keepAliveMethod === 'ping') {
        await pingTab(tab);
      }
    }
  } catch (error) {
    console.error('Error performing keep alive:', error);
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
    isActive = request.settings.isActive;
    refreshInterval = request.settings.refreshInterval;
    keepAliveMethod = request.settings.keepAliveMethod;
    
    saveSettings();
    
    if (isActive) {
      startKeepAlive();
    } else {
      stopKeepAlive();
    }
    
    sendResponse({ success: true });
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  loadSettings().then(() => {
    startKeepAlive();
  });
});

// Keep service worker alive
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // This helps keep the service worker active
  return true;
});
