/**
 * Pabbly Flow - Recorder Script
 * Handles microphone recording using MediaRecorder API
 * Runs in a hidden BrowserWindow (renderer process)
 *
 * Flow:
 * 1. Main process sends 'start-recording' -> start MediaRecorder
 * 2. Main process sends 'stop-recording' -> stop MediaRecorder
 * 3. On stop, send audio buffer to main process via 'audio-captured'
 * 4. Main process handles STT and paste (more reliable, no CORS issues)
 */

const { ipcRenderer } = require('electron');

// ============ Configuration ============
const CONFIG = {
  mimeType: 'audio/webm;codecs=opus', // Preferred format
  fallbackMimeType: 'audio/webm',
  timeslice: 100 // Collect data every 100ms
};

// ============ State ============
let mediaRecorder = null;
let audioChunks = [];
let audioStream = null;
let isRecording = false;
let currentMimeType = CONFIG.fallbackMimeType;

// ============ MediaRecorder Setup ============
async function initMediaRecorder() {
  try {
    console.log('[Recorder] Requesting microphone access...');

    // Request microphone access
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000 // Whisper works well with 16kHz
      }
    });

    // Determine supported MIME type
    if (MediaRecorder.isTypeSupported(CONFIG.mimeType)) {
      currentMimeType = CONFIG.mimeType;
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      currentMimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      currentMimeType = 'audio/mp4';
    }

    console.log(`[Recorder] Using MIME type: ${currentMimeType}`);

    mediaRecorder = new MediaRecorder(audioStream, { mimeType: currentMimeType });

    // ---- Event Handlers ----

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('[Recorder] MediaRecorder stopped');
      isRecording = false;

      if (audioChunks.length === 0) {
        console.log('[Recorder] No audio data captured');
        ipcRenderer.send('recording-error', 'No audio data captured');
        return;
      }

      // Create blob from chunks
      const audioBlob = new Blob(audioChunks, { type: currentMimeType });
      console.log(`[Recorder] Audio blob created: ${audioBlob.size} bytes`);

      // Convert blob to ArrayBuffer, then to array for IPC transfer
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        console.log('[Recorder] Sending audio to main process...');

        // Send audio data to main process for STT
        // Main process will handle transcription and paste
        ipcRenderer.send('audio-captured', {
          buffer: Array.from(uint8Array), // Convert to regular array for IPC
          mimeType: currentMimeType,
          size: audioBlob.size
        });

      } catch (error) {
        console.error('[Recorder] Failed to process audio:', error);
        ipcRenderer.send('recording-error', error.message);
      }

      // Clear chunks for next recording
      audioChunks = [];
    };

    mediaRecorder.onerror = (event) => {
      console.error('[Recorder] MediaRecorder error:', event.error);
      isRecording = false;
      ipcRenderer.send('recording-error', event.error?.message || 'Recording error');
    };

    mediaRecorder.onstart = () => {
      console.log('[Recorder] MediaRecorder started');
      isRecording = true;
      ipcRenderer.send('recording-started');
    };

    console.log('[Recorder] MediaRecorder initialized successfully');
    ipcRenderer.send('recorder-ready');

  } catch (error) {
    console.error('[Recorder] Failed to initialize:', error);

    let errorMessage = error.message;
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Microphone access denied. Please grant permission in System Preferences.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No microphone found. Please connect a microphone.';
    }

    ipcRenderer.send('recorder-error', errorMessage);
  }
}

// ============ Recording Controls ============
function startRecording() {
  if (!mediaRecorder) {
    console.log('[Recorder] MediaRecorder not initialized');
    ipcRenderer.send('recording-error', 'Recorder not initialized');
    return false;
  }

  if (isRecording || mediaRecorder.state === 'recording') {
    console.log('[Recorder] Already recording');
    return false;
  }

  // Clear any previous chunks
  audioChunks = [];

  // Start recording with timeslice
  mediaRecorder.start(CONFIG.timeslice);
  return true;
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== 'recording') {
    console.log('[Recorder] Not currently recording');
    return false;
  }

  mediaRecorder.stop();
  console.log('[Recorder] Stopping recording...');
  return true;
}

// ============ IPC Handlers ============
ipcRenderer.on('start-recording', () => {
  console.log('[Recorder] Received start-recording command');
  startRecording();
});

ipcRenderer.on('stop-recording', () => {
  console.log('[Recorder] Received stop-recording command');
  stopRecording();
});

// ============ Initialize ============
console.log('[Recorder] Recorder script loaded');
initMediaRecorder();
