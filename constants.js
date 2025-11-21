/**
 * Constants for Keep Logged In Extension
 */
export const CONSTANTS = {
  // Storage Keys
  STORAGE: {
    IS_ACTIVE: 'isActive',
    REFRESH_INTERVAL: 'refreshInterval',
    KEEP_ALIVE_METHOD: 'keepAliveMethod',
    WHITELIST: 'whitelist',
    BLACKLIST: 'blacklist',
    ACTIVE_HOURS: 'activeHours',
    BATTERY_SAVER: 'batterySaver',
    ACTIVITY_LOG: 'activityLog'
  },

  // Defaults
  DEFAULTS: {
    IS_ACTIVE: true,
    REFRESH_INTERVAL: 3, // Minutes
    KEEP_ALIVE_METHOD: 'ping',
    WHITELIST: [],
    BLACKLIST: [],
    ACTIVE_HOURS: { enabled: false, start: '09:00', end: '17:00' },
    BATTERY_SAVER: false,
    ACTIVITY_LOG: []
  },

  // Limits
  LIMITS: {
    MIN_INTERVAL: 1,
    MAX_INTERVAL: 60,
    MAX_LOG_ENTRIES: 50
  },

  // Colors
  COLORS: {
    ACTIVE: '#4CAF50', // Green
    REFRESH: '#FF6B35', // Orange
    INACTIVE: '#F44336' // Red
  },

  // Alarms
  ALARMS: {
    KEEP_ALIVE: 'keepAliveAlarm'
  },

  // Messages
  MESSAGES: {
    GET_SETTINGS: 'getSettings',
    UPDATE_SETTINGS: 'updateSettings',
    TEST_KEEP_ALIVE: 'testKeepAlive',
    POPUP_OPENED: 'popupOpened',
    KEEP_ALIVE: 'keepAlive',
    KEEP_SERVICE_WORKER_ALIVE: 'keepServiceWorkerAlive',
    PING: 'ping',
    PONG: 'pong',
    DIAGNOSTICS: 'diagnostics'
  }
};
