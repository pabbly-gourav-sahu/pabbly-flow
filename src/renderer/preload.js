/**
 * Pabbly Flow - Renderer Preload Script
 * Exposes IPC methods to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  validateShortcut: (shortcut) => ipcRenderer.invoke('settings:validateShortcut', shortcut),

  // History (stored in electron-store for persistence)
  getHistory: () => ipcRenderer.invoke('history:get'),
  addToHistory: (item) => ipcRenderer.invoke('history:add', item),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  deleteHistoryItem: (id) => ipcRenderer.invoke('history:delete', id),

  // Theme
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (mode) => ipcRenderer.invoke('theme:set', mode),

  // Window controls
  closeWindow: () => ipcRenderer.send('window:close'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:version'),

  // Recording control
  toggleRecording: () => ipcRenderer.send('toggle-recording'),
  onRecordingState: (callback) => {
    ipcRenderer.removeAllListeners('recording-state');
    ipcRenderer.on('recording-state', (event, data) => callback(data));
  },
  removeRecordingStateListener: () => {
    ipcRenderer.removeAllListeners('recording-state');
  },

  // Listen for new transcriptions from main process
  onTranscription: (callback) => {
    ipcRenderer.removeAllListeners('transcription:new');
    ipcRenderer.on('transcription:new', (event, data) => callback(data));
  },
  removeTranscriptionListener: () => {
    ipcRenderer.removeAllListeners('transcription:new');
  },

  // Listen for errors from main process
  onError: (callback) => {
    ipcRenderer.removeAllListeners('app:error');
    ipcRenderer.on('app:error', (event, data) => callback(data));
  },
  removeErrorListener: () => {
    ipcRenderer.removeAllListeners('app:error');
  },
});
