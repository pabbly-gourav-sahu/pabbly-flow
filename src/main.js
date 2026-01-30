/**
 * Pabbly Flow - Desktop App
 * Voice-to-text with system-wide typing and Settings UI
 *
 * Flow:
 * 1. User presses global shortcut to start recording
 * 2. Overlay appears with mic animation
 * 3. User presses shortcut again to stop
 * 4. Audio sent to Whisper STT service
 * 5. Transcribed text pasted at cursor location (if autoPaste enabled)
 */

const { app, Tray, Menu, globalShortcut, nativeImage, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');

// Import modules
const config = require('./config');
const stt = require('./stt');
const paste = require('./paste');
const { getSettings, setSettings, getSetting, resetSettings } = require('./store');

// ============ State ============
let tray = null;
let isRecording = false;
let overlayWindow = null;
let recorderWindow = null;
let settingsWindow = null;
let recorderReady = false;
let targetApp = null;
let currentShortcut = null;

// ============ Settings Window ============
function createSettingsWindow() {
  // If settings window already exists, focus it
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 520,
    height: 580,
    minWidth: 480,
    minHeight: 500,
    show: false,
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'settings/preload.js')
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings/settings.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  console.log('[Main] Settings window created');
}

// ============ Overlay Window ============
function createOverlayWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const { width, height, margin } = config.overlay;

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: screenWidth - width - margin,
    y: screenHeight - height - margin,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    focusable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.loadFile(path.join(__dirname, 'overlay/overlay.html'));

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  console.log('[Main] Overlay window created');
}

// ============ Recorder Window (Hidden) ============
function createRecorderWindow() {
  recorderWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  recorderWindow.loadFile(path.join(__dirname, 'recorder/recorder.html'));

  recorderWindow.on('closed', () => {
    recorderWindow = null;
    recorderReady = false;
  });

  console.log('[Main] Recorder window created (hidden)');
}

// ============ Recording Control ============
async function startRecording() {
  if (!recorderReady) {
    console.log('[Main] Recorder not ready yet');
    return false;
  }

  // Get the frontmost app BEFORE showing overlay
  targetApp = await paste.getFrontmostApp();
  console.log(`[Main] Target app for paste: ${targetApp}`);

  isRecording = true;

  if (overlayWindow) {
    overlayWindow.webContents.send('set-state', 'recording');
    overlayWindow.show();
  }

  if (recorderWindow) {
    recorderWindow.webContents.send('start-recording');
  }

  updateTrayStatus('Recording...');
  console.log('[Main] Recording started');
  return true;
}

function stopRecording() {
  if (!isRecording) return false;

  isRecording = false;

  if (overlayWindow) {
    overlayWindow.webContents.send('set-state', 'processing');
  }

  if (recorderWindow) {
    recorderWindow.webContents.send('stop-recording');
  }

  updateTrayStatus('Processing...');
  console.log('[Main] Recording stopped, waiting for audio...');
  return true;
}

// ============ STT + Paste Flow ============
async function processAudio(audioData) {
  console.log('[Main] Processing audio...');
  console.log(`[Main] Audio size: ${audioData.size} bytes, MIME: ${audioData.mimeType}`);

  const settings = getSettings();
  const audioBuffer = Buffer.from(audioData.buffer);

  // Determine file extension
  let filename = 'recording.webm';
  if (audioData.mimeType.includes('mp4')) filename = 'recording.mp4';
  else if (audioData.mimeType.includes('wav')) filename = 'recording.wav';

  // Check STT service
  const isHealthy = await stt.checkHealth(settings.sttServerUrl);
  if (!isHealthy) {
    console.error('[Main] STT service is not available');
    showError('STT service offline');
    return;
  }

  // Transcribe audio with settings
  console.log('[Main] Sending to STT service...');
  const result = await stt.transcribe(audioBuffer, filename, {
    serverUrl: settings.sttServerUrl,
    language: settings.language,
    translateToEnglish: settings.translateToEnglish
  });

  if (!result.success) {
    console.error('[Main] Transcription failed:', result.error);
    showError(result.error);
    return;
  }

  const text = result.text;
  console.log(`[Main] Transcription: "${text}"`);

  if (!text || !text.trim()) {
    console.log('[Main] No text transcribed');
    showError('No speech detected');
    return;
  }

  // Hide overlay
  if (overlayWindow) {
    overlayWindow.hide();
  }

  // Handle paste based on settings
  if (settings.autoPaste) {
    console.log(`[Main] Auto-pasting to target app: ${targetApp}`);
    const pasteResult = await paste.typeText(text, targetApp);

    if (pasteResult.success) {
      console.log('[Main] Text pasted successfully!');
      showSuccess();
    } else {
      console.error('[Main] Paste failed:', pasteResult.error);
      // Still copy to clipboard as fallback
      clipboard.writeText(text.trim());
      showError('Paste failed - copied to clipboard');
    }
  } else {
    // Just copy to clipboard
    clipboard.writeText(text.trim());
    console.log('[Main] Text copied to clipboard (auto-paste disabled)');
    showSuccess();
  }
}

function showSuccess() {
  if (overlayWindow) {
    overlayWindow.webContents.send('set-state', 'success');
  }
  updateTrayStatus('Ready');

  setTimeout(() => {
    if (overlayWindow) overlayWindow.hide();
  }, 800);
}

function showError(message) {
  console.error(`[Main] Error: ${message}`);

  if (overlayWindow) {
    overlayWindow.webContents.send('set-state', 'error');
  }
  updateTrayStatus('Error');

  setTimeout(() => {
    if (overlayWindow) overlayWindow.hide();
    updateTrayStatus('Ready');
  }, 1500);
}

// ============ IPC Handlers ============
function setupIPC() {
  // Recorder IPC
  ipcMain.on('recorder-ready', () => {
    recorderReady = true;
    console.log('[Main] Recorder is ready');
  });

  ipcMain.on('recording-started', () => {
    console.log('[Main] Recording confirmed started');
  });

  ipcMain.on('audio-captured', async (event, audioData) => {
    console.log('[Main] Audio captured, starting STT flow...');
    await processAudio(audioData);
  });

  ipcMain.on('recording-error', (event, errorMsg) => {
    console.error(`[Main] Recording error: ${errorMsg}`);
    isRecording = false;
    showError(errorMsg);
  });

  // Settings IPC
  ipcMain.handle('settings:get', () => {
    return getSettings();
  });

  ipcMain.handle('settings:save', async (event, newSettings) => {
    console.log('[Main] Saving settings:', newSettings);

    // Check if shortcut changed
    const oldShortcut = getSetting('shortcut');
    const shortcutChanged = newSettings.shortcut && newSettings.shortcut !== oldShortcut;

    // Save settings
    setSettings(newSettings);

    // Re-register shortcut if changed
    if (shortcutChanged) {
      registerGlobalShortcut(newSettings.shortcut);
    }

    // Update tray to show new shortcut
    updateTrayMenu('Ready');

    return { success: true };
  });

  ipcMain.handle('settings:reset', () => {
    resetSettings();
    // Re-register default shortcut
    const defaultShortcut = 'CommandOrControl+Shift+.';
    registerGlobalShortcut(defaultShortcut);
    updateTrayMenu('Ready');
    return { success: true };
  });

  ipcMain.handle('settings:validateShortcut', (event, shortcut) => {
    // Try to register the shortcut temporarily to validate it
    try {
      // Unregister current shortcut
      if (currentShortcut) {
        globalShortcut.unregister(currentShortcut);
      }

      // Try to register new one
      const success = globalShortcut.register(shortcut, () => {});

      if (success) {
        // Unregister the test and restore old shortcut
        globalShortcut.unregister(shortcut);
        if (currentShortcut) {
          registerGlobalShortcut(currentShortcut);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Main] Shortcut validation error:', error);
      // Restore old shortcut
      if (currentShortcut) {
        registerGlobalShortcut(currentShortcut);
      }
      return false;
    }
  });

  ipcMain.on('settings:close', () => {
    if (settingsWindow) {
      settingsWindow.close();
    }
  });
}

// ============ Tray Setup ============
function createTray() {
  const iconPath = path.join(__dirname, '../assets/trayTemplate.png');

  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) icon = createFallbackIcon();
  } catch (e) {
    icon = createFallbackIcon();
  }

  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip(config.app.name);
  updateTrayMenu('Ready');

  tray.on('click', () => tray.popUpContextMenu());
  console.log('[Main] Tray created');
}

function updateTrayMenu(status) {
  const settings = getSettings();
  const shortcutDisplay = formatShortcutForDisplay(settings.shortcut);

  const contextMenu = Menu.buildFromTemplate([
    { label: config.app.name, enabled: false },
    { type: 'separator' },
    { label: `Status: ${status}`, enabled: false },
    { type: 'separator' },
    { label: `Shortcut: ${shortcutDisplay}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Settings...',
      click: () => createSettingsWindow()
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  if (tray) {
    tray.setContextMenu(contextMenu);
  }
}

function updateTrayStatus(status) {
  updateTrayMenu(status);
}

function formatShortcutForDisplay(shortcut) {
  if (!shortcut) return 'Not set';
  return shortcut
    .replace('CommandOrControl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl')
    .replace('Command', 'Cmd')
    .replace('Control', 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replace(/\+/g, '+');
}

function createFallbackIcon() {
  const size = 16;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="6" r="3" fill="#666"/>
    <rect x="6" y="6" width="4" height="5" fill="#666"/>
    <path d="M4 9 Q4 14 8 14 Q12 14 12 9" stroke="#666" fill="none" stroke-width="1.5"/>
    <line x1="8" y1="14" x2="8" y2="16" stroke="#666" stroke-width="1.5"/>
  </svg>`;
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  );
}

// ============ Global Shortcut ============
function registerGlobalShortcut(shortcut) {
  // Unregister existing shortcut
  if (currentShortcut) {
    globalShortcut.unregister(currentShortcut);
    console.log(`[Main] Unregistered old shortcut: ${currentShortcut}`);
  }

  // Use provided shortcut or get from settings
  const shortcutKey = shortcut || getSetting('shortcut') || 'CommandOrControl+Shift+.';

  const registered = globalShortcut.register(shortcutKey, () => {
    console.log('');
    console.log('=================================');
    console.log('  SHORTCUT TRIGGERED!');
    console.log(`  isRecording: ${isRecording}`);
    console.log('=================================');

    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  if (registered) {
    currentShortcut = shortcutKey;
    console.log(`[Main] Global shortcut registered: ${shortcutKey}`);
  } else {
    console.error(`[Main] Failed to register shortcut: ${shortcutKey}`);
  }

  return registered;
}

// ============ App Lifecycle ============
app.whenReady().then(async () => {
  console.log('');
  console.log('========================================');
  console.log('  Pabbly Flow - Desktop App');
  console.log('  Voice to Text with Settings');
  console.log('========================================');
  console.log('');

  // Hide dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  // Load and display settings
  const settings = getSettings();
  console.log('[Main] Current settings:', settings);

  // Check dependencies
  const pasteAvailable = await paste.checkAvailability();
  console.log(`[Main] Paste available: ${pasteAvailable}`);

  const sttAvailable = await stt.checkHealth(settings.sttServerUrl);
  console.log(`[Main] STT service available: ${sttAvailable}`);
  if (!sttAvailable) {
    console.log('[Main] WARNING: STT service not running. Start it with:');
    console.log('[Main]   cd stt-service && source .venv/bin/activate && uvicorn main:app --port 8000');
  }

  // Setup
  setupIPC();
  createOverlayWindow();
  createRecorderWindow();
  createTray();
  registerGlobalShortcut();

  console.log('');
  console.log('[Main] App is running in the background.');
  console.log(`[Main] Press ${formatShortcutForDisplay(settings.shortcut)} to start/stop recording.`);
  console.log('[Main] Click tray icon → Settings to configure.');
  console.log('');
});

app.on('window-all-closed', (e) => e.preventDefault());

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  console.log('[Main] Goodbye!');
});
