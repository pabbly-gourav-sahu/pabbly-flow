/**
 * Pabbly Flow - STT Module
 * Handles communication with local Whisper STT service
 * Supports configurable server URL, language, and translation
 */

const http = require('http');
const path = require('path');
const url = require('url');

// ============ Default Configuration ============
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:8000/transcribe',
  healthPath: '/health',
  timeout: 30000,
  language: 'auto',
  translateToEnglish: true
};

/**
 * Parse server URL into host, port, and path
 * @param {string} serverUrl
 * @returns {{hostname: string, port: number, path: string}}
 */
function parseServerUrl(serverUrl) {
  try {
    const parsed = new URL(serverUrl);
    return {
      hostname: parsed.hostname,
      port: parseInt(parsed.port) || 8000,
      path: parsed.pathname || '/transcribe'
    };
  } catch (e) {
    // Fallback to defaults
    return {
      hostname: 'localhost',
      port: 8000,
      path: '/transcribe'
    };
  }
}

/**
 * Check if STT service is available
 * @param {string} serverUrl - Optional server URL to check
 * @returns {Promise<boolean>}
 */
async function checkHealth(serverUrl) {
  return new Promise((resolve) => {
    const { hostname, port } = parseServerUrl(serverUrl || DEFAULT_CONFIG.serverUrl);

    const options = {
      hostname,
      port,
      path: DEFAULT_CONFIG.healthPath,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Transcribe audio buffer to text
 * @param {Buffer} audioBuffer - The audio data as a Buffer
 * @param {string} filename - Original filename (for extension detection)
 * @param {Object} options - Transcription options
 * @param {string} options.serverUrl - STT server URL
 * @param {string} options.language - Language code (auto, en, hi, etc.)
 * @param {boolean} options.translateToEnglish - Whether to translate to English
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
async function transcribe(audioBuffer, filename = 'recording.webm', options = {}) {
  const {
    serverUrl = DEFAULT_CONFIG.serverUrl,
    language = DEFAULT_CONFIG.language,
    translateToEnglish = DEFAULT_CONFIG.translateToEnglish
  } = options;

  return new Promise((resolve) => {
    console.log('[STT] Starting transcription...');
    console.log(`[STT] Audio size: ${audioBuffer.length} bytes`);
    console.log(`[STT] Language: ${language}, Translate: ${translateToEnglish}`);

    const { hostname, port, path: serverPath } = parseServerUrl(serverUrl);

    // Build query parameters for language and translation
    const queryParams = new URLSearchParams();
    if (language && language !== 'auto') {
      queryParams.append('language', language);
    }
    if (translateToEnglish) {
      queryParams.append('task', 'translate');
    } else {
      queryParams.append('task', 'transcribe');
    }

    const queryString = queryParams.toString();
    const fullPath = queryString ? `${serverPath}?${queryString}` : serverPath;

    // Create multipart form data
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    const ext = path.extname(filename) || '.webm';

    // Determine content type
    let contentType = 'audio/webm';
    if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.mp4') contentType = 'audio/mp4';

    // Build multipart body
    const headerPart =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`;

    const footerPart = `\r\n--${boundary}--\r\n`;

    const headerBuffer = Buffer.from(headerPart, 'utf8');
    const footerBuffer = Buffer.from(footerPart, 'utf8');
    const bodyBuffer = Buffer.concat([headerBuffer, audioBuffer, footerBuffer]);

    const requestOptions = {
      hostname,
      port,
      path: fullPath,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      },
      timeout: DEFAULT_CONFIG.timeout
    };

    console.log(`[STT] Sending to ${hostname}:${port}${fullPath}`);

    const req = http.request(requestOptions, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      res.on('end', () => {
        console.log(`[STT] Response status: ${res.statusCode}`);

        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(responseData);
            const text = result.text || '';
            console.log(`[STT] Transcription successful: "${text}"`);
            resolve({ success: true, text });
          } catch (e) {
            console.error('[STT] Failed to parse response:', e.message);
            resolve({ success: false, error: 'Invalid response from server' });
          }
        } else {
          console.error(`[STT] Server error: ${res.statusCode}`);
          resolve({ success: false, error: `Server returned ${res.statusCode}` });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[STT] Request error:', error.message);
      resolve({ success: false, error: error.message || 'Connection failed' });
    });

    req.on('timeout', () => {
      console.error('[STT] Request timed out');
      req.destroy();
      resolve({ success: false, error: 'Request timed out' });
    });

    req.write(bodyBuffer);
    req.end();
  });
}

module.exports = {
  checkHealth,
  transcribe,
  DEFAULT_CONFIG
};
