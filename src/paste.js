/**
 * Pabbly Flow - Paste Module
 * Handles system-wide text pasting via clipboard + simulated keystroke
 * Wispr-style: remembers the app + cursor position, pastes back there
 */

const { clipboard } = require('electron');
const { exec } = require('child_process');

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
 * Activate a specific application and wait until it is actually frontmost
 * @param {string} appName
 * @returns {Promise<boolean>}
 */
function activateApp(appName) {
  return new Promise((resolve) => {
    if (process.platform === 'darwin' && appName) {
      console.log(`[Paste] Activating app: ${appName}`);
      // Use 'set frontmost' instead of 'activate' to preserve cursor position
      const script = `
        tell application "System Events"
          set frontmost of process "${appName}" to true
        end tell
        delay 0.15
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
        end tell
        return frontApp
      `;
      exec(`osascript -e '${script}'`, (error, stdout) => {
        if (error) {
          console.error(`[Paste] Failed to activate ${appName}:`, error.message);
          resolve(false);
        } else {
          const currentFront = stdout.trim();
          const success = currentFront === appName;
          if (!success) {
            console.warn(`[Paste] Wanted ${appName}, but frontmost is ${currentFront}`);
          }
          resolve(success);
        }
      });
    } else {
      resolve(false);
    }
  });
}

/**
 * Type text at the current cursor position — Wispr-style
 * 1. Save current clipboard
 * 2. Copy transcribed text to clipboard
 * 3. Activate target app (where cursor was)
 * 4. Simulate Cmd+V
 * 5. Restore original clipboard
 *
 * @param {string} text - Text to type
 * @param {string} targetApp - App name to activate before pasting
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

  // Step 1: Save current clipboard so we can restore it after paste
  let originalClipboard = '';
  try {
    originalClipboard = clipboard.readText();
  } catch (e) {
    // ignore
  }

  // Step 2: Copy transcribed text to clipboard
  try {
    clipboard.writeText(trimmedText);
    console.log('[Paste] Text copied to clipboard');
  } catch (error) {
    console.error('[Paste] Failed to copy to clipboard:', error);
    return { success: false, error: 'Failed to copy to clipboard' };
  }

  // Step 3: Activate target app (only if it's not already frontmost)
  if (targetApp && process.platform === 'darwin') {
    const currentFront = await getFrontmostApp();
    if (currentFront !== targetApp) {
      console.log(`[Paste] Target "${targetApp}" not frontmost (current: "${currentFront}"), activating...`);
      const activated = await activateApp(targetApp);
      if (!activated) {
        console.warn(`[Paste] Could not activate ${targetApp}, attempting paste anyway`);
      }
    } else {
      console.log('[Paste] Target app already frontmost, skipping activation');
    }
    // Delay to let the app stabilize focus and cursor
    await sleep(100);
  }

  // Step 4: Simulate paste keystroke (Cmd+V)
  try {
    await simulatePaste();
    console.log('[Paste] Paste completed!');

    // Step 5: Restore original clipboard after a short delay
    // (so the paste has time to complete before we overwrite clipboard)
    setTimeout(() => {
      try {
        clipboard.writeText(originalClipboard);
        console.log('[Paste] Original clipboard restored');
      } catch (e) {
        // ignore
      }
    }, 500);

    return { success: true };
  } catch (error) {
    console.error('[Paste] Failed to simulate paste:', error);
    // Text is still on clipboard as fallback
    return { success: false, error: error.message || 'Failed to simulate paste' };
  }
}

/**
 * Simulate paste keystroke (Cmd+V on macOS, Ctrl+V on Windows)
 * Uses a single AppleScript call that does the keystroke immediately
 * @returns {Promise<void>}
 */
function simulatePaste() {
  return new Promise((resolve, reject) => {
    if (process.platform === 'darwin') {
      // Small delay within AppleScript ensures the app is ready for input
      const script = `
        tell application "System Events"
          keystroke "v" using command down
        end tell
      `;
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
 * Check if paste functionality is available (Accessibility perms on macOS)
 */
async function checkAvailability() {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      // Test if we can actually use System Events (requires Accessibility permission)
      const script = `tell application "System Events" to return name of first application process whose frontmost is true`;
      exec(`osascript -e '${script}'`, (error) => {
        if (error) {
          console.error('[Paste] Accessibility permission NOT granted. Auto-paste will not work.');
          console.error('[Paste] Go to: System Settings → Privacy & Security → Accessibility → Enable Electron/Pabbly Flow');
          resolve(false);
        } else {
          console.log('[Paste] Accessibility permission OK');
          resolve(true);
        }
      });
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
  activateApp
};
