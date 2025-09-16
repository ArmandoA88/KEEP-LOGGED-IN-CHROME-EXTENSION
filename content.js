// Content script for Keep Logged In extension
console.log('Keep Logged In content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'keepAlive') {
    // Perform keep alive actions without refreshing the page
    console.log('📡 PING: Keep Logged In extension is keeping this tab alive');
    
    // Show visual indicator that ping happened
    showPingIndicator();
    
    // Perform keep alive actions
    performKeepAliveActions();
    
    sendResponse({ success: true, url: window.location.href, title: document.title });
  }
});

// Show visual indicator that a ping happened
function showPingIndicator() {
  // Create a small, temporary visual indicator
  const indicator = document.createElement('div');
  indicator.innerHTML = '📡 Keep Alive Ping';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #4CAF50;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    font-weight: bold;
    z-index: 999999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  document.body.appendChild(indicator);
  
  // Fade in
  setTimeout(() => {
    indicator.style.opacity = '1';
  }, 10);
  
  // Fade out and remove after 2 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 300);
  }, 2000);
}

// Perform various keep alive actions
function performKeepAliveActions() {
  try {
    // Method 1: Simulate user activity by moving mouse cursor slightly
    simulateActivity();
    
    // Method 2: Send a small network request to keep connection alive
    sendKeepAliveRequest();
    
    // Method 3: Interact with common session elements
    interactWithSessionElements();
    
    console.log('Keep alive actions performed');
  } catch (error) {
    console.error('Error performing keep alive actions:', error);
  }
}

// Simulate user activity
function simulateActivity() {
  // Create a small, invisible mouse movement
  const event = new MouseEvent('mousemove', {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: Math.random() * 10,
    clientY: Math.random() * 10
  });
  document.dispatchEvent(event);
  
  // Simulate a small scroll to show activity
  window.scrollBy(0, 1);
  setTimeout(() => window.scrollBy(0, -1), 100);
}

// Send a keep alive network request
function sendKeepAliveRequest() {
  // Try to send a small request to the current domain
  try {
    const img = new Image();
    img.src = window.location.origin + '/favicon.ico?' + Date.now();
    img.onerror = () => {}; // Ignore errors
    img.onload = () => {}; // Ignore success
  } catch (error) {
    // Ignore errors - this is just a keep alive attempt
  }
}

// Interact with common session elements
function interactWithSessionElements() {
  // Look for common session-related elements and interact with them subtly
  const sessionElements = [
    'input[type="hidden"][name*="session"]',
    'input[type="hidden"][name*="token"]',
    'input[type="hidden"][name*="csrf"]',
    '[data-session]',
    '[data-keepalive]'
  ];
  
  sessionElements.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      // Trigger a focus/blur event to indicate activity
      if (element.focus && element.blur) {
        element.focus();
        setTimeout(() => element.blur(), 10);
      }
    });
  });
}

// Periodically check if the page is still active and send heartbeat
function startHeartbeat() {
  setInterval(() => {
    // Send a heartbeat to indicate the page is still active
    if (document.visibilityState === 'visible') {
      // Page is visible, send activity signal
      const event = new CustomEvent('keepAliveHeartbeat', {
        detail: { timestamp: Date.now() }
      });
      document.dispatchEvent(event);
    }
  }, 30000); // Every 30 seconds
}

// Start heartbeat when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startHeartbeat);
} else {
  startHeartbeat();
}

// Prevent the page from going idle by occasionally updating the title
let originalTitle = document.title;
let titleUpdateInterval;

function startTitleKeepAlive() {
  titleUpdateInterval = setInterval(() => {
    if (document.title === originalTitle) {
      document.title = originalTitle + ' ';
    } else {
      document.title = originalTitle;
    }
  }, 60000); // Every minute
}

// Clean up title updates when page is about to unload
window.addEventListener('beforeunload', () => {
  if (titleUpdateInterval) {
    clearInterval(titleUpdateInterval);
  }
  document.title = originalTitle;
});

// Start title keep alive
startTitleKeepAlive();

// Override common timeout functions to extend their duration
const originalSetTimeout = window.setTimeout;
const originalSetInterval = window.setInterval;

// Extend timeouts that might be session-related
window.setTimeout = function(callback, delay, ...args) {
  // If delay suggests it might be a session timeout (5+ minutes), extend it
  if (delay >= 300000) { // 5 minutes or more
    delay = delay * 2; // Double the timeout
    console.log('Extended timeout from', delay/2, 'to', delay, 'ms');
  }
  return originalSetTimeout.call(this, callback, delay, ...args);
};

// Monitor for session warnings and try to dismiss them
function monitorSessionWarnings() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Look for common session warning patterns
          const sessionWarningSelectors = [
            '[class*="session"][class*="warning"]',
            '[class*="timeout"][class*="warning"]',
            '[class*="expire"][class*="warning"]',
            '[id*="session"][id*="warning"]',
            '[id*="timeout"][id*="warning"]'
          ];
          
          sessionWarningSelectors.forEach(selector => {
            const warnings = node.querySelectorAll ? node.querySelectorAll(selector) : [];
            warnings.forEach(warning => {
              // Look for "extend session" or "stay logged in" buttons
              const extendButtons = warning.querySelectorAll('button, a, input[type="button"]');
              extendButtons.forEach(button => {
                const text = button.textContent.toLowerCase();
                if (text.includes('extend') || text.includes('stay') || text.includes('continue')) {
                  console.log('Auto-clicking session extend button');
                  button.click();
                }
              });
            });
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start monitoring for session warnings
if (document.body) {
  monitorSessionWarnings();
} else {
  document.addEventListener('DOMContentLoaded', monitorSessionWarnings);
}
