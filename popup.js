// Popup script for Keep Logged In extension
document.addEventListener('DOMContentLoaded', async () => {
  const activeToggle = document.getElementById('activeToggle');
  const intervalInput = document.getElementById('intervalInput');
  const methodSelect = document.getElementById('methodSelect');
  const methodDescription = document.getElementById('methodDescription');
  const status = document.getElementById('status');
  
  // Method descriptions
  const methodDescriptions = {
    refresh: 'Refresh tabs completely to reset session timers',
    ping: 'Send keep-alive signals without refreshing pages'
  };
  
  // Load current settings
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    
    // Update UI with current settings
    updateToggle(activeToggle, response.isActive);
    intervalInput.value = response.refreshInterval;
    methodSelect.value = response.keepAliveMethod;
    updateMethodDescription(response.keepAliveMethod);
    updateStatus(response.isActive);
    
  } catch (error) {
    console.error('Error loading settings:', error);
    status.textContent = 'Error loading settings';
    status.className = 'status inactive';
  }
  
  // Toggle switch event listener
  activeToggle.addEventListener('click', async () => {
    const isActive = !activeToggle.classList.contains('active');
    updateToggle(activeToggle, isActive);
    await saveSettings();
  });
  
  // Interval input event listener
  intervalInput.addEventListener('change', async () => {
    let value = parseInt(intervalInput.value);
    if (value < 1) value = 1;
    if (value > 60) value = 60;
    intervalInput.value = value;
    await saveSettings();
  });
  
  // Method select event listener
  methodSelect.addEventListener('change', async () => {
    updateMethodDescription(methodSelect.value);
    await saveSettings();
  });
  
  // Update toggle switch appearance
  function updateToggle(toggle, isActive) {
    if (isActive) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }
  
  // Update method description
  function updateMethodDescription(method) {
    methodDescription.textContent = methodDescriptions[method] || '';
  }
  
  // Update status display
  function updateStatus(isActive) {
    if (isActive) {
      status.textContent = 'Extension is ACTIVE - Keeping sessions alive';
      status.className = 'status active';
    } else {
      status.textContent = 'Extension is INACTIVE - Sessions may timeout';
      status.className = 'status inactive';
    }
  }
  
  // Save settings to background script
  async function saveSettings() {
    try {
      const settings = {
        isActive: activeToggle.classList.contains('active'),
        refreshInterval: parseInt(intervalInput.value),
        keepAliveMethod: methodSelect.value
      };
      
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: settings
      });
      
      if (response.success) {
        updateStatus(settings.isActive);
        console.log('Settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
      
    } catch (error) {
      console.error('Error saving settings:', error);
      status.textContent = 'Error saving settings';
      status.className = 'status inactive';
    }
  }
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    // Space bar to toggle active state
    if (event.code === 'Space' && event.target === document.body) {
      event.preventDefault();
      activeToggle.click();
    }
    
    // Enter to save (if focused on input)
    if (event.code === 'Enter' && event.target === intervalInput) {
      intervalInput.blur();
    }
  });
  
  // Add visual feedback for interactions
  activeToggle.addEventListener('mousedown', () => {
    activeToggle.style.transform = 'scale(0.95)';
  });
  
  activeToggle.addEventListener('mouseup', () => {
    activeToggle.style.transform = 'scale(1)';
  });
  
  activeToggle.addEventListener('mouseleave', () => {
    activeToggle.style.transform = 'scale(1)';
  });
  
  // Show current tab count
  try {
    const tabs = await chrome.tabs.query({});
    const validTabs = tabs.filter(tab => 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://')
    );
    
    // Add tab count info
    const tabInfo = document.createElement('div');
    tabInfo.style.cssText = `
      text-align: center;
      font-size: 11px;
      color: #666;
      margin-top: 10px;
      padding: 5px;
      background: #f9f9f9;
      border-radius: 4px;
    `;
    tabInfo.textContent = `Monitoring ${validTabs.length} of ${tabs.length} tabs`;
    
    const infoDiv = document.querySelector('.info');
    infoDiv.parentNode.insertBefore(tabInfo, infoDiv);
    
  } catch (error) {
    console.error('Error getting tab count:', error);
  }
});

// Handle extension icon click analytics
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'popupOpened') {
    console.log('Popup opened by user');
    sendResponse({ received: true });
  }
});
