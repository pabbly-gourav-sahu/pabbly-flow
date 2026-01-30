/**
 * Pabbly Flow - Settings Preload Script
 * Secure bridge between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process
// to communicate with the main process securely
contextBridge.exposeInMainWorld('electronAPI', {
  // Get all settings
  getSettings: () => ipcRenderer.invoke('settings:get'),

  // Save settings
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Reset settings to defaults
  resetSettings: () => ipcRenderer.invoke('settings:reset'),

  // Validate shortcut
  validateShortcut: (shortcut) => ipcRenderer.invoke('settings:validateShortcut', shortcut),

  // Close settings window
  closeWindow: () => ipcRenderer.send('settings:close'),

  // Listen for settings updates from main
  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings:updated', (event, settings) => callback(settings));
  }
});
