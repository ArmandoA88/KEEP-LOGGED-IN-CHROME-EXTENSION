// Popup script for Keep Logged In extension
document.addEventListener('DOMContentLoaded', async () => {
  // UI Elements
  const statusCard = document.getElementById('statusCard');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');
  const toggleIcon = document.getElementById('toggleIcon');
  const toggleText = document.getElementById('toggleText');
  const intervalInput = document.getElementById('intervalInput');
  const methodSelect = document.getElementById('methodSelect');
  const tabList = document.getElementById('tabList');
  const tabCount = document.getElementById('tabCount');
  const testBtn = document.getElementById('testBtn');

  // State
  let isActive = false;

  // Initialize
  await loadSettings();
  await updateDashboard();

  // Event Listeners
  toggleBtn.addEventListener('click', async () => {
    isActive = !isActive;
    await updateState(isActive);
    await saveSettings();
  });

  intervalInput.addEventListener('change', async () => {
    let value = parseInt(intervalInput.value);
    if (value < 1) value = 1;
    if (value > 60) value = 60;
    intervalInput.value = value;
    await saveSettings();
  });

  methodSelect.addEventListener('change', async () => {
    await saveSettings();
  });

  testBtn.addEventListener('click', async () => {
    await runDiagnostics();
  });

  // Functions
  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      isActive = response.isActive;

      // Update UI
      updateState(isActive);
      intervalInput.value = response.refreshInterval;
      methodSelect.value = response.keepAliveMethod;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  function updateState(active) {
    if (active) {
      statusCard.classList.add('active');
      statusText.textContent = 'Active';
      toggleIcon.textContent = '⏸️';
      toggleText.textContent = 'Pause Extension';
    } else {
      statusCard.classList.remove('active');
      statusText.textContent = 'Inactive';
      toggleIcon.textContent = '▶️';
      toggleText.textContent = 'Activate Extension';
    }
  }

  async function saveSettings() {
    try {
      const settings = {
        isActive: isActive,
        refreshInterval: parseInt(intervalInput.value),
        keepAliveMethod: methodSelect.value
      };

      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: settings
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async function updateDashboard() {
    try {
      const tabs = await chrome.tabs.query({});
      const validTabs = tabs.filter(tab =>
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://')
      );

      tabCount.textContent = `${validTabs.length} monitored`;
      tabList.innerHTML = '';

      validTabs.forEach(tab => {
        const item = document.createElement('div');
        item.className = 'tab-item';

        const img = document.createElement('img');
        img.className = 'tab-icon';
        img.src = tab.favIconUrl || 'icon16.png';
        img.onerror = () => { img.src = 'icon16.png'; };

        item.innerHTML = `
          <div class="tab-info">
            <span class="tab-title">${tab.title}</span>
            <div class="tab-status">
              <span class="status-dot" style="width: 6px; height: 6px;"></span>
              Monitoring
            </div>
          </div>
        `;
        item.prepend(img);

        tabList.appendChild(item);
      });
    } catch (error) {
      console.error('Error updating dashboard:', error);
      tabList.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 12px;">Could not load tabs</div>';
    }
  }

  async function runDiagnostics() {
    const originalText = testBtn.textContent;
    testBtn.disabled = true;
    testBtn.textContent = 'Running...';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'testKeepAlive' });

      if (response.success) {
        testBtn.textContent = '✅ Success!';
        testBtn.style.borderColor = 'var(--success)';
        testBtn.style.color = 'var(--success)';
      } else {
        throw new Error('Test failed');
      }
    } catch (error) {
      testBtn.textContent = '❌ Failed';
      testBtn.style.borderColor = 'var(--danger)';
      testBtn.style.color = 'var(--danger)';
    }

    setTimeout(() => {
      testBtn.disabled = false;
      testBtn.textContent = originalText;
      testBtn.style.borderColor = '';
      testBtn.style.color = '';
    }, 2000);
  }

  // Analytics
  chrome.runtime.sendMessage({ action: 'popupOpened' });
});
