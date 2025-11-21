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

  // New UI Elements
  const batterySaverToggle = document.getElementById('batterySaverToggle');
  const activeHoursToggle = document.getElementById('activeHoursToggle');
  const activeHoursInputs = document.getElementById('activeHoursInputs');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const domainModeSelect = document.getElementById('domainModeSelect');
  const domainListContainer = document.getElementById('domainListContainer');
  const domainListInput = document.getElementById('domainListInput');
  const activityLogList = document.getElementById('activityLogList');

  // Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // State
  let isActive = false;

  // Initialize
  await loadSettings();
  await updateDashboard();
  setupTabs();

  // Event Listeners
  toggleBtn.addEventListener('click', async () => {
    isActive = !isActive;
    await updateState(isActive);
    await saveSettings();
  });

  intervalInput.addEventListener('change', saveSettings);
  methodSelect.addEventListener('change', saveSettings);
  batterySaverToggle.addEventListener('change', saveSettings);

  activeHoursToggle.addEventListener('change', () => {
    toggleActiveHoursInputs();
    saveSettings();
  });

  startTimeInput.addEventListener('change', saveSettings);
  endTimeInput.addEventListener('change', saveSettings);

  domainModeSelect.addEventListener('change', () => {
    toggleDomainList();
    saveSettings();
  });

  domainListInput.addEventListener('change', saveSettings);

  testBtn.addEventListener('click', async () => {
    await runDiagnostics();
  });

  // Functions
  function setupTabs() {
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // Check scroll indicator
        setTimeout(checkScroll, 50);
      });
    });
  }

  function toggleActiveHoursInputs() {
    activeHoursInputs.style.display = activeHoursToggle.checked ? 'grid' : 'none';
  }

  function toggleDomainList() {
    const mode = domainModeSelect.value;
    domainListContainer.style.display = mode === 'none' ? 'none' : 'block';
  }

  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });

      // Basic Settings
      // Basic Settings
      isActive = response.isActive !== undefined ? response.isActive : true;
      updateState(isActive);
      intervalInput.value = response.refreshInterval || 3;
      methodSelect.value = response.keepAliveMethod || 'ping';

      // New Settings
      batterySaverToggle.checked = response.batterySaver || false;

      // Active Hours
      if (response.activeHours) {
        activeHoursToggle.checked = response.activeHours.enabled;
        startTimeInput.value = response.activeHours.start;
        endTimeInput.value = response.activeHours.end;
        toggleActiveHoursInputs();
      }

      // Domain Rules
      // Determine mode based on whitelist/blacklist presence
      if (response.whitelist && response.whitelist.length > 0) {
        domainModeSelect.value = 'whitelist';
        domainListInput.value = response.whitelist.join('\n');
      } else if (response.blacklist && response.blacklist.length > 0) {
        domainModeSelect.value = 'blacklist';
        domainListInput.value = response.blacklist.join('\n');
      } else {
        domainModeSelect.value = 'none';
      }
      toggleDomainList();

      // Activity Log
      renderActivityLog(response.activityLog);

    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  function renderActivityLog(log) {
    if (!log || log.length === 0) {
      activityLogList.innerHTML = '<div class="empty-state">No recent activity</div>';
      return;
    }

    activityLogList.innerHTML = '';
    log.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'log-entry';

      const time = new Date(entry.timestamp).toLocaleTimeString();

      div.innerHTML = `
        <div class="log-time">${time}</div>
        <div class="log-message">${entry.message}</div>
      `;
      activityLogList.appendChild(div);
    });
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
      // Parse domain list
      const domains = domainListInput.value
        .split('\n')
        .map(d => d.trim())
        .filter(d => d.length > 0);

      const settings = {
        isActive: isActive,
        refreshInterval: parseInt(intervalInput.value),
        keepAliveMethod: methodSelect.value,
        batterySaver: batterySaverToggle.checked,
        activeHours: {
          enabled: activeHoursToggle.checked,
          start: startTimeInput.value,
          end: endTimeInput.value
        },
        // Reset both lists first
        whitelist: [],
        blacklist: []
      };

      // Populate appropriate list based on mode
      if (domainModeSelect.value === 'whitelist') {
        settings.whitelist = domains;
      } else if (domainModeSelect.value === 'blacklist') {
        settings.blacklist = domains;
      }

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
        img.src = tab.favIconUrl || 'icons/icon-active.png';
        img.onerror = () => { img.src = 'icons/icon-active.png'; };

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

  // Scroll Indicator
  const scrollIndicator = document.getElementById('scrollIndicator');

  function checkScroll() {
    // Only show on settings tab
    if (!document.getElementById('settings-tab').classList.contains('active')) {
      scrollIndicator.classList.remove('visible');
      return;
    }

    // Check if page is scrollable and not at bottom
    const isScrollable = document.documentElement.scrollHeight > window.innerHeight;
    const isAtBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 20;

    if (isScrollable && !isAtBottom) {
      scrollIndicator.classList.add('visible');
    } else {
      scrollIndicator.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', checkScroll);
  window.addEventListener('resize', checkScroll);

  // Check initially and on tab change
  setTimeout(checkScroll, 100);

  // Analytics
  chrome.runtime.sendMessage({ action: 'popupOpened' });
});
