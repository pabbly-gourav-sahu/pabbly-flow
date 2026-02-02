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
    } else if (process.platform === 'win32') {
      const psScript = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
public class ForegroundHelper {
    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    public static string GetName() {
        IntPtr hwnd = GetForegroundWindow();
        uint pid;
        GetWindowThreadProcessId(hwnd, out pid);
        try { return Process.GetProcessById((int)pid).ProcessName; }
        catch { return ""; }
    }
}
'@
[ForegroundHelper]::GetName()
`;
      runPowershell(psScript).then(name => {
        console.log(`[Paste] Frontmost app (Windows): "${name}"`);
        resolve(name || null);
      }).catch((err) => {
        console.error('[Paste] Windows getFrontmostApp FAILED:', err.message);
        resolve(null);
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
      // Use 'set frontmost' instead of 'activate' to preserve cursor position.
      // Includes retry: if first attempt doesn't take, wait and try once more.
      const script = `
        tell application "System Events"
          set frontmost of process "${appName}" to true
        end tell
        delay 0.1
        tell application "System Events"
          set currentFront to name of first application process whose frontmost is true
        end tell
        if currentFront is not "${appName}" then
          delay 0.1
          tell application "System Events"
            set frontmost of process "${appName}" to true
          end tell
          delay 0.1
          tell application "System Events"
            set currentFront to name of first application process whose frontmost is true
          end tell
        end if
        return currentFront
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
    } else if (process.platform === 'win32' && appName) {
      console.log(`[Paste] Activating app (Windows): ${appName}`);
      const safeName = appName.replace(/'/g, "''");
      const psScript = `
$procs = Get-Process -Name '${safeName}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }
if ($procs) {
    Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinActivator {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Activate(IntPtr hwnd) {
        keybd_event(0x12, 0, 0, UIntPtr.Zero);
        keybd_event(0x12, 0, 2, UIntPtr.Zero);
        ShowWindow(hwnd, 9);
        SetForegroundWindow(hwnd);
    }
}
'@
    [WinActivator]::Activate($procs[0].MainWindowHandle)
    Write-Output 'true'
} else {
    Write-Output 'false'
}
`;
      runPowershell(psScript).then(result => {
        const success = result === 'true';
        console.log(`[Paste] Windows activateApp result: "${result}", success: ${success}`);
        if (!success) console.warn(`[Paste] Could not activate ${appName} on Windows`);
        resolve(success);
      }).catch((err) => {
        console.error(`[Paste] Windows activateApp FAILED:`, err.message);
        resolve(false);
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

  console.log(`[Paste] Typing text: "${trimmedText.substring(0, 50)}${trimmedText.length > 50 ? '...' : ''}" | platform: ${process.platform} | targetApp: ${targetApp}`);

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
  if (targetApp) {
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
    // Windows needs more time for focus to settle after activation
    await sleep(process.platform === 'win32' ? 200 : 50);
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
      console.log('[Paste] Windows: sending Ctrl+V via .NET SendKeys...');
      // Primary: .NET SendKeys — pre-compiled assembly, fast, always available
      const sendKeysScript = `
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait('^v')
`;
      runPowershell(sendKeysScript).then(() => {
        console.log('[Paste] Windows: SendKeys paste SUCCESS');
        resolve();
      }).catch((err) => {
        console.warn('[Paste] Windows: SendKeys paste FAILED:', err.message);
        console.log('[Paste] Windows: trying keybd_event fallback...');
        // Fallback: Win32 keybd_event (hardware-level, works even with focus issues)
        const keyboardScript = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Threading;
public class KeySender {
    [DllImport("user32.dll")]
    static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Paste() {
        Thread.Sleep(100);
        keybd_event(0x11, 0, 0, UIntPtr.Zero);
        keybd_event(0x56, 0, 0, UIntPtr.Zero);
        keybd_event(0x56, 0, 2, UIntPtr.Zero);
        keybd_event(0x11, 0, 2, UIntPtr.Zero);
    }
}
'@
[KeySender]::Paste()
`;
        runPowershell(keyboardScript).then(() => {
          console.log('[Paste] Windows: keybd_event paste SUCCESS');
          resolve();
        }).catch(err2 => {
          console.error('[Paste] Windows: keybd_event paste FAILED:', err2.message);
          reject(err2);
        });
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
 * Helper: Run PowerShell script using EncodedCommand (avoids escaping issues)
 * @param {string} script - PowerShell script to execute
 * @returns {Promise<string>} - stdout trimmed
 */
function runPowershell(script) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 10000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        console.error('[Paste] PowerShell error:', stderr);
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
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
