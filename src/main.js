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
const { getSettings, setSettings, getSetting, resetSettings, getHistory, addToHistory, clearHistory, deleteHistoryItem } = require('./store');

// ============ State ============
let tray = null;
let isRecording = false;
let overlayWindow = null;
let recorderWindow = null;
let settingsWindow = null;
let mainWindow = null;
let recorderReady = false;
let targetApp = null;
let currentShortcut = null;

// Check if running in development (app.isPackaged is checked later when app is ready)
let isDev = process.env.NODE_ENV === 'development';

// ============ Main App Window ============
function createMainWindow() {
  // If main window already exists, focus it
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  const storedTheme = getSetting('theme') || 'light';
  const appIcon = nativeImage.createFromPath(path.join(__dirname, '../build/icon.png'));
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    titleBarStyle: 'hiddenInset',
    icon: appIcon,
    backgroundColor: storedTheme === 'dark' ? '#121212' : '#faf9f7',
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'renderer/preload.js')
    }
  });

  // Load React app - dev server or built files
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Show dock icon when main window opens
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Hide dock icon when main window closes
    if (process.platform === 'darwin' && app.dock) {
      app.dock.hide();
    }
  });

  console.log('[Main] Main app window created');
}

// ============ Settings Window (Legacy - keeping for tray) ============
function createSettingsWindow() {
  // Open main window instead, navigate to settings
  createMainWindow();
}

// ============ Overlay Window ============
function createOverlayWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const overlayWidth = 200;
  const overlayHeight = 50;

  overlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.round((screenWidth - overlayWidth) / 2),
    y: Math.round(screenHeight - screenHeight * 0.1 - overlayHeight),
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'overlay/overlay-preload.js')
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'recorder/recorder-preload.js')
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
// source: 'shortcut' (global hotkey) or 'button' (UI button click)
let recordingSource = 'shortcut';

async function startRecording(source = 'shortcut') {
  if (!recorderReady) {
    console.log('[Main] Recorder not ready yet');
    return false;
  }

  recordingSource = source;

  if (source === 'shortcut') {
    // Shortcut: user is in the target app, capture it
    targetApp = await paste.getFrontmostApp();
    console.log(`[Main] [shortcut] Target app for paste: ${targetApp}`);
  } else {
    // Button: user is in our Electron window, will capture target at paste time
    targetApp = null;
    console.log(`[Main] [button] Recording started from UI, will paste to focused app later`);
  }

  isRecording = true;

  // Only notify renderer for button-triggered recording (so shortcut doesn't affect the button)
  if (source === 'button' && mainWindow) {
    mainWindow.webContents.send('recording-state', { isRecording: true });
  }

  // Only show overlay for shortcut-triggered recording
  if (source === 'shortcut' && overlayWindow) {
    overlayWindow.webContents.send('set-state', 'recording');
    overlayWindow.showInactive();
  }

  if (recorderWindow) {
    recorderWindow.webContents.send('start-recording');
  }

  updateTrayStatus('Recording...');
  console.log(`[Main] Recording started (source: ${source})`);
  return true;
}

function stopRecording() {
  if (!isRecording) return false;

  isRecording = false;

  // Only notify renderer for button-triggered recording
  if (recordingSource === 'button' && mainWindow) {
    mainWindow.webContents.send('recording-state', { isRecording: false });
  }

  // Only update overlay if it was shown (shortcut-triggered)
  if (recordingSource === 'shortcut' && overlayWindow) {
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

  // Send transcription to main window for history
  if (mainWindow) {
    mainWindow.webContents.send('transcription:new', {
      text: text.trim(),
      timestamp: new Date().toISOString()
    });
    mainWindow.webContents.send('app:success', { message: 'Text transcribed successfully' });
  }

  // Handle paste based on settings
  if (settings.autoPaste) {
    let pasteTarget = targetApp;

    if (!pasteTarget) {
      // Button-triggered: user should have switched back to target app by now
      // Get whatever app is currently focused
      pasteTarget = await paste.getFrontmostApp();
      const ownAppNames = ['Electron', 'electron', config.app.name];
      if (pasteTarget && ownAppNames.includes(pasteTarget)) {
        // Still in our app — just copy to clipboard, user will paste manually
        console.log(`[Main] User still in Pabbly Flow, copying to clipboard`);
        clipboard.writeText(text.trim());
        showSuccess();
        return;
      }
      console.log(`[Main] Button-triggered paste target: ${pasteTarget}`);
    }

    // Hide overlay before pasting to prevent any focus interference
    if (recordingSource === 'shortcut' && overlayWindow) {
      overlayWindow.hide();
    }
    await new Promise(r => setTimeout(r, 50)); // let OS process the hide

    console.log(`[Main] Auto-pasting to target app: ${pasteTarget}`);
    const pasteResult = await paste.typeText(text, pasteTarget);

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
  if (recordingSource === 'shortcut' && overlayWindow) {
    overlayWindow.webContents.send('set-state', 'success');
    overlayWindow.showInactive();
    setTimeout(() => {
      if (overlayWindow) overlayWindow.hide();
    }, 800);
  }
  updateTrayStatus('Ready');
}

function showError(message) {
  console.error(`[Main] Error: ${message}`);

  if (recordingSource === 'shortcut' && overlayWindow) {
    overlayWindow.webContents.send('set-state', 'error');
    overlayWindow.webContents.send('set-error-message', message);
    overlayWindow.showInactive();
    setTimeout(() => {
      if (overlayWindow) overlayWindow.hide();
      updateTrayStatus('Ready');
    }, 1500);
  } else {
    updateTrayStatus('Ready');
  }
  if (mainWindow) {
    mainWindow.webContents.send('app:error', { message });
  }
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

  // Recording toggle from renderer UI (button click)
  ipcMain.on('toggle-recording', () => {
    console.log(`[Main] toggle-recording IPC received. isRecording=${isRecording}, recorderReady=${recorderReady}`);
    if (!isRecording) {
      startRecording('button');
    } else {
      stopRecording();
    }
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

  // Window controls
  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  // App info
  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });

  // Send transcription to main window
  ipcMain.on('transcription:send', (event, text) => {
    if (mainWindow) {
      mainWindow.webContents.send('transcription:new', { text, timestamp: new Date().toISOString() });
    }
  });

  // History IPC (stored in electron-store for persistence)
  ipcMain.handle('history:get', () => {
    return getHistory();
  });

  ipcMain.handle('history:add', (event, item) => {
    return addToHistory(item);
  });

  ipcMain.handle('history:clear', () => {
    clearHistory();
    return { success: true };
  });

  ipcMain.handle('history:delete', (event, id) => {
    return deleteHistoryItem(id);
  });

  // STT Health check
  ipcMain.handle('stt:health', async () => {
    const settings = getSettings();
    return await stt.checkHealth(settings.sttServerUrl);
  });

  // Theme IPC
  ipcMain.handle('theme:get', () => {
    return getSetting('theme') || 'light';
  });

  ipcMain.handle('theme:set', (event, mode) => {
    const { setSetting } = require('./store');
    setSetting('theme', mode);
    // Update main window background
    if (mainWindow) {
      mainWindow.setBackgroundColor(mode === 'dark' ? '#121212' : '#faf9f7');
    }
    return { success: true };
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
      label: 'Open App',
      click: () => createMainWindow()
    },
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
      startRecording('shortcut');
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

  // Set custom dock icon and hide dock on macOS (dock shows when main window opens)
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(path.join(__dirname, '../build/icon.png'));
    app.dock.setIcon(dockIcon);
    app.dock.hide();
  }

  // Load and display settings
  const settings = getSettings();
  console.log('[Main] Current settings:', settings);

  // Check dependencies
  const pasteAvailable = await paste.checkAvailability();
  console.log(`[Main] Paste available: ${pasteAvailable}`);
  if (!pasteAvailable) {
    console.log('[Main] ⚠️  AUTO-PASTE DISABLED: Accessibility permission required');
    console.log('[Main]    Go to: System Settings → Privacy & Security → Accessibility');
    console.log('[Main]    Enable: Electron (or Pabbly Flow)');
  }

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

  // Open main window automatically
  createMainWindow();

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
