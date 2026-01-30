/**
 * Pabbly Flow - Settings UI Logic
 * Handles user interactions and IPC communication
 */

// DOM Elements
const elements = {
  shortcut: document.getElementById('shortcut'),
  shortcutStatus: document.getElementById('shortcut-status'),
  whisperModel: document.getElementById('whisperModel'),
  language: document.getElementById('language'),
  sttServerUrl: document.getElementById('sttServerUrl'),
  autoPaste: document.getElementById('autoPaste'),
  translateToEnglish: document.getElementById('translateToEnglish'),
  saveBtn: document.getElementById('saveBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  resetBtn: document.getElementById('resetBtn'),
  toast: document.getElementById('toast')
};

// State
let currentSettings = {};
let isRecordingShortcut = false;
let pressedKeys = new Set();

// ============ Initialize ============
async function init() {
  try {
    // Load current settings
    currentSettings = await window.electronAPI.getSettings();
    populateForm(currentSettings);
    console.log('[Settings] Loaded settings:', currentSettings);
  } catch (error) {
    console.error('[Settings] Failed to load settings:', error);
    showToast('Failed to load settings', 'error');
  }

  // Setup event listeners
  setupEventListeners();
}

// ============ Form Population ============
function populateForm(settings) {
  elements.shortcut.value = formatShortcut(settings.shortcut);
  elements.whisperModel.value = settings.whisperModel;
  elements.language.value = settings.language;
  elements.sttServerUrl.value = settings.sttServerUrl;
  elements.autoPaste.checked = settings.autoPaste;
  elements.translateToEnglish.checked = settings.translateToEnglish;
}

function formatShortcut(shortcut) {
  return shortcut
    .replace('CommandOrControl', '⌘/Ctrl')
    .replace('Command', '⌘')
    .replace('Control', 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replace('Option', '⌥')
    .replace(/\+/g, ' + ');
}

function normalizeShortcut(shortcut) {
  return shortcut
    .replace('⌘/Ctrl', 'CommandOrControl')
    .replace('⌘', 'Command')
    .replace('Ctrl', 'Control')
    .replace('⇧', 'Shift')
    .replace('⌥', 'Alt')
    .replace(/ \+ /g, '+');
}

// ============ Event Listeners ============
function setupEventListeners() {
  // Shortcut recording
  elements.shortcut.addEventListener('click', startShortcutRecording);
  elements.shortcut.addEventListener('keydown', handleShortcutKeydown);
  elements.shortcut.addEventListener('keyup', handleShortcutKeyup);
  elements.shortcut.addEventListener('blur', stopShortcutRecording);

  // Save button
  elements.saveBtn.addEventListener('click', saveSettings);

  // Cancel button
  elements.cancelBtn.addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });

  // Reset button
  elements.resetBtn.addEventListener('click', resetSettings);
}

// ============ Shortcut Recording ============
function startShortcutRecording() {
  isRecordingShortcut = true;
  pressedKeys.clear();
  elements.shortcut.value = 'Press keys...';
  elements.shortcut.classList.add('recording');
  elements.shortcutStatus.textContent = '';
  elements.shortcutStatus.className = 'status-indicator';
}

function stopShortcutRecording() {
  isRecordingShortcut = false;
  elements.shortcut.classList.remove('recording');

  // If no valid shortcut was recorded, restore the original
  if (elements.shortcut.value === 'Press keys...' || pressedKeys.size < 2) {
    elements.shortcut.value = formatShortcut(currentSettings.shortcut);
  }
  pressedKeys.clear();
}

function handleShortcutKeydown(event) {
  if (!isRecordingShortcut) return;

  event.preventDefault();
  event.stopPropagation();

  const key = event.key;
  const code = event.code;

  // Track modifier keys
  if (event.metaKey) pressedKeys.add('Command');
  if (event.ctrlKey) pressedKeys.add('Control');
  if (event.shiftKey) pressedKeys.add('Shift');
  if (event.altKey) pressedKeys.add('Alt');

  // Track regular keys (not modifiers)
  if (!['Meta', 'Control', 'Shift', 'Alt'].includes(key)) {
    // Use the key for letters/numbers, code for special keys
    let keyName = key.length === 1 ? key.toUpperCase() : key;

    // Handle special keys
    if (code.startsWith('Key')) {
      keyName = code.replace('Key', '');
    } else if (code.startsWith('Digit')) {
      keyName = code.replace('Digit', '');
    } else if (key === '.') {
      keyName = '.';
    } else if (key === ',') {
      keyName = ',';
    } else if (key === '/') {
      keyName = '/';
    }

    pressedKeys.add(keyName);
  }

  // Update display
  updateShortcutDisplay();
}

function handleShortcutKeyup(event) {
  if (!isRecordingShortcut) return;

  // Check if we have a valid shortcut (at least one modifier + one key)
  const modifiers = ['Command', 'Control', 'Shift', 'Alt'];
  const hasModifier = modifiers.some(m => pressedKeys.has(m));
  const hasKey = [...pressedKeys].some(k => !modifiers.includes(k));

  if (hasModifier && hasKey) {
    validateAndSetShortcut();
  }
}

function updateShortcutDisplay() {
  const order = ['Command', 'Control', 'Shift', 'Alt'];
  const orderedKeys = [];

  // Add modifiers in order
  order.forEach(mod => {
    if (pressedKeys.has(mod)) {
      orderedKeys.push(mod);
    }
  });

  // Add other keys
  pressedKeys.forEach(key => {
    if (!order.includes(key)) {
      orderedKeys.push(key);
    }
  });

  if (orderedKeys.length > 0) {
    const shortcut = orderedKeys.join('+');
    elements.shortcut.value = formatShortcut(shortcut);
  }
}

async function validateAndSetShortcut() {
  const order = ['Command', 'Control', 'Shift', 'Alt'];
  const orderedKeys = [];

  order.forEach(mod => {
    if (pressedKeys.has(mod)) {
      orderedKeys.push(mod);
    }
  });

  pressedKeys.forEach(key => {
    if (!order.includes(key)) {
      orderedKeys.push(key);
    }
  });

  // Use CommandOrControl for cross-platform compatibility
  let shortcut = orderedKeys.join('+');
  if (shortcut.startsWith('Command+') || shortcut.startsWith('Control+')) {
    shortcut = shortcut.replace(/^(Command|Control)/, 'CommandOrControl');
  }

  // Validate with main process
  try {
    const isValid = await window.electronAPI.validateShortcut(shortcut);

    if (isValid) {
      elements.shortcutStatus.textContent = 'Valid';
      elements.shortcutStatus.className = 'status-indicator valid';
      currentSettings.shortcut = shortcut;
    } else {
      elements.shortcutStatus.textContent = 'Invalid';
      elements.shortcutStatus.className = 'status-indicator invalid';
    }
  } catch (error) {
    console.error('[Settings] Shortcut validation error:', error);
  }

  stopShortcutRecording();
}

// ============ Save Settings ============
async function saveSettings() {
  const newSettings = {
    shortcut: normalizeShortcut(elements.shortcut.value) || currentSettings.shortcut,
    whisperModel: elements.whisperModel.value,
    language: elements.language.value,
    sttServerUrl: elements.sttServerUrl.value.trim(),
    autoPaste: elements.autoPaste.checked,
    translateToEnglish: elements.translateToEnglish.checked
  };

  // Validate URL
  if (newSettings.sttServerUrl && !isValidUrl(newSettings.sttServerUrl)) {
    showToast('Invalid STT Server URL', 'error');
    return;
  }

  try {
    await window.electronAPI.saveSettings(newSettings);
    showToast('Settings saved successfully', 'success');

    // Close window after short delay
    setTimeout(() => {
      window.electronAPI.closeWindow();
    }, 1000);
  } catch (error) {
    console.error('[Settings] Failed to save settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

// ============ Reset Settings ============
async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;

  try {
    await window.electronAPI.resetSettings();
    currentSettings = await window.electronAPI.getSettings();
    populateForm(currentSettings);
    showToast('Settings reset to defaults', 'success');
  } catch (error) {
    console.error('[Settings] Failed to reset settings:', error);
    showToast('Failed to reset settings', 'error');
  }
}

// ============ Utilities ============
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type}`;
  elements.toast.classList.remove('hidden');
  elements.toast.classList.add('show');

  setTimeout(() => {
    elements.toast.classList.remove('show');
    setTimeout(() => {
      elements.toast.classList.add('hidden');
    }, 300);
  }, 2500);
}

// ============ Start ============
document.addEventListener('DOMContentLoaded', init);
