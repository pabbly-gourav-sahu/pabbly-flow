/**
 * Pabbly Flow - Centralized Configuration
 * Loads settings from .env file
 */

const path = require('path');

// Load .env file from project root
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});

/**
 * Helper to parse boolean from env string
 */
function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Helper to parse integer from env string
 */
function parseInt(value, defaultValue = 0) {
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ============ Configuration Object ============
const config = {
  // App info
  app: {
    name: process.env.APP_NAME || 'Pabbly Flow',
    debug: parseBool(process.env.DEBUG, false)
  },

  // STT Server
  stt: {
    serverUrl: process.env.STT_SERVER_URL || 'http://35.165.164.32:8000/transcribe',
    healthEndpoint: process.env.STT_HEALTH_ENDPOINT || '/health',
    timeout: parseInt(process.env.STT_TIMEOUT, 30000)
  },

  // Default settings (used when no user settings exist)
  defaults: {
    shortcut: process.env.DEFAULT_SHORTCUT || 'CommandOrControl+Shift+.',
    whisperModel: process.env.DEFAULT_WHISPER_MODEL || 'base',
    language: process.env.DEFAULT_LANGUAGE || 'auto',
    autoPaste: parseBool(process.env.DEFAULT_AUTO_PASTE, true),
    translateToEnglish: parseBool(process.env.DEFAULT_TRANSLATE_TO_ENGLISH, true)
  },

  // Overlay window
  overlay: {
    width: parseInt(process.env.OVERLAY_WIDTH, 300),
    height: parseInt(process.env.OVERLAY_HEIGHT, 70),
    margin: parseInt(process.env.OVERLAY_MARGIN, 20)
  }
};

// Log configuration in debug mode
if (config.app.debug) {
  console.log('[Config] Loaded configuration:', JSON.stringify(config, null, 2));
}

module.exports = config;
