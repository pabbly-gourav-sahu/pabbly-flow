/**
 * Pabbly Flow - Recorder Preload Script
 * Exposes only the IPC methods the recorder needs
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('recorderAPI', {
  // Send events to main process
  sendReady: () => ipcRenderer.send('recorder-ready'),
  sendRecordingStarted: () => ipcRenderer.send('recording-started'),
  sendAudioCaptured: (data) => ipcRenderer.send('audio-captured', data),
  sendRecordingError: (msg) => ipcRenderer.send('recording-error', msg),

  // Listen for commands from main process
  onStartRecording: (callback) => {
    ipcRenderer.on('start-recording', () => callback());
  },
  onStopRecording: (callback) => {
    ipcRenderer.on('stop-recording', () => callback());
  },
});
