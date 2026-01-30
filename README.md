# Pabbly Flow - Desktop App

A voice-to-text desktop application that runs in the system tray. Press a global shortcut to trigger voice recording (coming in future steps).

## Current Status: Step 1 (Foundation)

This step includes:
- Electron app running in background
- System tray icon with menu
- Global shortcut detection
- Clean architecture for future expansion

## Requirements

- Node.js 18+
- macOS (Windows support planned)

## Installation

```bash
cd desktop-app
npm install
```

## Running

```bash
npm start
```

Or with logging enabled:
```bash
npm run dev
```

## Usage

1. Start the app - it runs in the background
2. Look for the icon in your menu bar (macOS) or system tray (Windows)
3. Press the global shortcut:
   - **macOS**: `Cmd + Shift + .`
   - **Windows**: `Ctrl + Shift + V`
4. Check the terminal for "Shortcut triggered!" message

## Tray Menu

- **Pabbly Flow** - App name (header)
- **Status: Ready** - Current status
- **Shortcut: Cmd+Shift+.** - Shortcut reminder
- **Quit** - Exit the application

## Architecture

```
┌─────────────────────────────────────────┐
│           Electron Main Process          │
│                                          │
│  ┌──────────┐  ┌────────────────────┐   │
│  │   Tray   │  │  Global Shortcut   │   │
│  │   Icon   │  │   (Cmd+Shift+.)    │   │
│  └──────────┘  └────────────────────┘   │
│                        │                 │
│                        ▼                 │
│              [Future: Recorder]          │
│              [Future: STT API]           │
│              [Future: Paste]             │
└─────────────────────────────────────────┘
```

## Folder Structure

```
/desktop-app
├── src/
│   └── main.js          # Main Electron process
├── assets/
│   └── trayTemplate.png # Tray icon (macOS template)
├── package.json
└── README.md
```

## Future Steps

### Step 2: Microphone Recording
- Add `src/recorder.js`
- Use Web Audio API or node-record-lpcm16
- Start/stop recording on shortcut

### Step 3: STT Integration
- Add `src/stt.js`
- Connect to local Whisper server
- Transcribe recorded audio

### Step 4: System Paste
- Add `src/paste.js`
- Use robotjs or @nut-tree/nut-js
- Type transcribed text into active application

## Troubleshooting

### Shortcut not working?
- The shortcut might be used by another app
- Check System Preferences > Keyboard > Shortcuts on macOS
- Try changing the shortcut in `src/main.js`

### No tray icon?
- On macOS, look in the menu bar (top right)
- The icon might be hidden - check "Show in menu bar" settings

### App won't start?
- Make sure you ran `npm install`
- Check Node.js version: `node --version` (need 18+)

### "Cannot read properties of undefined" error?
- Some IDEs/tools set `ELECTRON_RUN_AS_NODE=1` which breaks Electron
- The npm scripts already handle this with `env -u ELECTRON_RUN_AS_NODE`
- If running manually, use: `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron .`

## License

MIT
