/**
 * Pabbly Flow - Overlay Preload Script
 * Exposes only the IPC methods the overlay needs
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  onSetState: (callback) => {
    ipcRenderer.on('set-state', (event, state) => callback(state));
  },
  onSetErrorMessage: (callback) => {
    ipcRenderer.on('set-error-message', (event, message) => callback(message));
  },
  onReset: (callback) => {
    ipcRenderer.on('reset', () => callback());
  },
});
