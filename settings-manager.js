import { CONSTANTS } from './constants.js';

/**
 * Manages extension settings and storage
 */
export class SettingsManager {
    constructor() {
        // Initialize settings with defaults, mapped to storage keys
        this.settings = {};
        Object.keys(CONSTANTS.STORAGE).forEach(key => {
            // key is e.g. 'IS_ACTIVE', 'REFRESH_INTERVAL'
            // CONSTANTS.STORAGE[key] is 'isActive', 'refreshInterval'
            // CONSTANTS.DEFAULTS[key] is the default value
            const storageKey = CONSTANTS.STORAGE[key];
            const defaultValue = CONSTANTS.DEFAULTS[key];
            this.settings[storageKey] = defaultValue;
        });

        this.loaded = false;
    }

    /**
     * Load settings from storage
     */
    async load() {
        try {
            const keys = Object.values(CONSTANTS.STORAGE);
            const result = await chrome.storage.sync.get(keys);

            // Merge loaded settings with defaults
            // We iterate over keys to ensure we don't overwrite defaults with undefined
            Object.keys(result).forEach(key => {
                if (result[key] !== undefined) {
                    this.settings[key] = result[key];
                }
            });

            // Ensure complex objects are initialized if missing
            if (!this.settings.activeHours) this.settings.activeHours = CONSTANTS.DEFAULTS.ACTIVE_HOURS;
            if (!this.settings.whitelist) this.settings.whitelist = CONSTANTS.DEFAULTS.WHITELIST;
            if (!this.settings.blacklist) this.settings.blacklist = CONSTANTS.DEFAULTS.BLACKLIST;

            this.loaded = true;
            return this.settings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.settings;
        }
    }

    /**
     * Save settings to storage
     * @param {Object} newSettings - Partial or full settings object
     */
    async save(newSettings) {
        try {
            // Update local state
            this.settings = {
                ...this.settings,
                ...newSettings
            };

            // Save to storage
            await chrome.storage.sync.set(this.settings);
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    /**
     * Get a specific setting value
     * @param {string} key - Setting key
     */
    get(key) {
        return this.settings[key];
    }

    /**
     * Get all settings
     */
    getAll() {
        return this.settings;
    }

    /**
     * Add an entry to the activity log
     * @param {string} message - Log message
     */
    async logActivity(message) {
        try {
            const entry = {
                timestamp: Date.now(),
                message: message
            };

            // Get current log
            let log = this.settings.activityLog || [];

            // Add new entry to beginning
            log.unshift(entry);

            // Trim to max size
            if (log.length > CONSTANTS.LIMITS.MAX_LOG_ENTRIES) {
                log = log.slice(0, CONSTANTS.LIMITS.MAX_LOG_ENTRIES);
            }

            // Save updated log
            await this.save({ activityLog: log });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
}
