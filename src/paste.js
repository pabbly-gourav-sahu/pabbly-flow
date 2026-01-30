/**
 * Pabbly Flow - Paste Module
 * Handles system-wide text pasting via clipboard + simulated keystroke
 * Like Whisper Flow - remembers the app where cursor was and pastes there
 */

const { clipboard } = require('electron');
const { exec } = require('child_process');

// ============ Configuration ============
const CONFIG = {
  pasteDelay: 100
};

/**
 * Get the currently focused (frontmost) application name
 * Call this BEFORE starting recording to remember where to paste
 * @returns {Promise<string|null>}
 */
function getFrontmostApp() {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      const script = `tell application "System Events" to return name of first application process whose frontmost is true`;
      exec(`osascript -e '${script}'`, (error, stdout) => {
        if (error) {
          console.error('[Paste] Failed to get frontmost app:', error.message);
          resolve(null);
        } else {
          const appName = stdout.trim();
          console.log(`[Paste] Frontmost app: ${appName}`);
          resolve(appName);
        }
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * Activate a specific application by name
 * @param {string} appName
 * @returns {Promise<boolean>}
 */
function activateApp(appName) {
  return new Promise((resolve) => {
    if (process.platform === 'darwin' && appName) {
      console.log(`[Paste] Activating app: ${appName}`);
      const script = `tell application "${appName}" to activate`;
      exec(`osascript -e '${script}'`, (error) => {
        if (error) {
          console.error(`[Paste] Failed to activate ${appName}:`, error.message);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } else {
      resolve(false);
    }
  });
}

/**
 * Type text at the current cursor position
 * @param {string} text - Text to type
 * @param {string} targetApp - App name to activate before pasting (required for reliable paste)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function typeText(text, targetApp = null) {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'No text provided' };
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    return { success: false, error: 'Empty text' };
  }

  console.log(`[Paste] Typing text: "${trimmedText.substring(0, 50)}${trimmedText.length > 50 ? '...' : ''}"`);

  // Step 1: Copy text to clipboard FIRST
  try {
    clipboard.writeText(trimmedText);
    console.log('[Paste] Text copied to clipboard');
  } catch (error) {
    console.error('[Paste] Failed to copy to clipboard:', error);
    return { success: false, error: 'Failed to copy to clipboard' };
  }

  // Step 2: Activate target app (the app where user was before recording)
  if (targetApp && process.platform === 'darwin') {
    const activated = await activateApp(targetApp);
    if (activated) {
      // Wait for app to become active and ready for input
      await sleep(150);
    }
  }

  // Step 3: Simulate paste keystroke
  try {
    await simulatePaste();
    console.log('[Paste] Paste completed!');
    return { success: true };
  } catch (error) {
    console.error('[Paste] Failed to simulate paste:', error);
    return { success: false, error: error.message || 'Failed to simulate paste' };
  }
}

/**
 * Simulate paste keystroke (Cmd+V on macOS, Ctrl+V on Windows)
 * @returns {Promise<void>}
 */
function simulatePaste() {
  return new Promise((resolve, reject) => {
    if (process.platform === 'darwin') {
      // Simple Cmd+V
      const script = `tell application "System Events" to keystroke "v" using command down`;

      exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
        if (error) {
          console.error('[Paste] AppleScript error:', stderr);
          reject(new Error(stderr || error.message));
        } else {
          resolve();
        }
      });

    } else if (process.platform === 'win32') {
      const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")`;
      exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve();
        }
      });

    } else {
      exec('xdotool key ctrl+v', (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve();
        }
      });
    }
  });
}

/**
 * Helper: Sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if paste functionality is available
 */
async function checkAvailability() {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec('which osascript', (error) => resolve(!error));
    } else if (process.platform === 'win32') {
      resolve(true);
    } else {
      exec('which xdotool', (error) => resolve(!error));
    }
  });
}

module.exports = {
  typeText,
  simulatePaste,
  checkAvailability,
  getFrontmostApp,
  activateApp,
  CONFIG
};
