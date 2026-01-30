/**
 * Pabbly Flow - Settings Store
 * Persistent settings using electron-store
 * Defaults loaded from .env via config.js
 */

const Store = require('electron-store');
const config = require('./config');

// Schema defines the structure and defaults for settings
const schema = {
  shortcut: {
    type: 'string',
    default: config.defaults.shortcut
  },
  whisperModel: {
    type: 'string',
    enum: ['tiny', 'base', 'small', 'medium', 'large'],
    default: config.defaults.whisperModel
  },
  language: {
    type: 'string',
    enum: ['auto', 'en', 'es', 'fr', 'de', 'ja', 'zh'],
    default: config.defaults.language
  },
  sttServerUrl: {
    type: 'string',
    default: config.stt.serverUrl
  },
  autoPaste: {
    type: 'boolean',
    default: config.defaults.autoPaste
  },
  translateToEnglish: {
    type: 'boolean',
    default: config.defaults.translateToEnglish
  },
  theme: {
    type: 'string',
    enum: ['light', 'dark'],
    default: 'light'
  }
};

// Create store with schema validation
const store = new Store({
  schema,
  name: 'pabbly-flow-settings',
  clearInvalidConfig: true
});

/**
 * Get all settings
 * @returns {Object}
 */
function getSettings() {
  return {
    shortcut: store.get('shortcut'),
    whisperModel: store.get('whisperModel'),
    language: store.get('language'),
    sttServerUrl: store.get('sttServerUrl'),
    autoPaste: store.get('autoPaste'),
    translateToEnglish: store.get('translateToEnglish')
  };
}

/**
 * Update settings
 * @param {Object} newSettings
 */
function setSettings(newSettings) {
  Object.entries(newSettings).forEach(([key, value]) => {
    if (schema[key] !== undefined) {
      store.set(key, value);
    }
  });
}

/**
 * Get a single setting
 * @param {string} key
 * @returns {any}
 */
function getSetting(key) {
  return store.get(key);
}

/**
 * Set a single setting
 * @param {string} key
 * @param {any} value
 */
function setSetting(key, value) {
  store.set(key, value);
}

/**
 * Reset all settings to defaults (from .env)
 */
function resetSettings() {
  store.clear();
}

// ============ History Management ============
const MAX_HISTORY_ITEMS = 100;

/**
 * Get transcription history
 * @returns {Array}
 */
function getHistory() {
  return store.get('history', []);
}

/**
 * Add item to history
 * @param {Object} item - { text, timestamp }
 * @returns {Array} updated history
 */
function addToHistory(item) {
  const history = getHistory();
  const newItem = {
    id: Date.now(),
    text: item.text,
    timestamp: item.timestamp || new Date().toISOString(),
  };
  const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
  store.set('history', updated);
  return updated;
}

/**
 * Clear all history
 */
function clearHistory() {
  store.set('history', []);
}

/**
 * Delete a single history item by id
 * @param {number} id
 * @returns {Array} updated history
 */
function deleteHistoryItem(id) {
  const history = getHistory();
  const updated = history.filter(item => item.id !== id);
  store.set('history', updated);
  return updated;
}

module.exports = {
  store,
  getSettings,
  setSettings,
  getSetting,
  setSetting,
  resetSettings,
  getHistory,
  addToHistory,
  clearHistory,
  deleteHistoryItem,
  schema
};
