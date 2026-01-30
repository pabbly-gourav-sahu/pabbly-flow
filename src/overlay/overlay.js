/**
 * Pabbly Flow - Overlay Script
 * Handles recording timer display and state updates
 */

// ============ State ============
let startTime = null;
let timerInterval = null;

// ============ DOM Elements ============
const micBubble = document.getElementById('mic-bubble');
const statusText = document.getElementById('status-text');
const durationEl = document.getElementById('duration');

// ============ Timer Functions ============
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    durationEl.textContent = formatDuration(elapsed);
  }, 100);
  console.log('[Overlay] Timer started');
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const elapsed = startTime ? Date.now() - startTime : 0;
  console.log(`[Overlay] Timer stopped. Duration: ${formatDuration(elapsed)}`);
  return elapsed;
}

function resetTimer() {
  stopTimer();
  startTime = null;
  durationEl.textContent = '0:00';
}

// ============ State Management ============
function setState(state) {
  // Remove all state classes
  micBubble.classList.remove('recording', 'processing', 'success', 'error');

  switch (state) {
    case 'recording':
      micBubble.classList.add('recording');
      statusText.textContent = 'Listening...';
      durationEl.style.display = '';
      startTimer();
      break;

    case 'processing':
      micBubble.classList.add('processing');
      statusText.textContent = 'Processing...';
      durationEl.style.display = 'none';
      stopTimer();
      break;

    case 'success':
      micBubble.classList.add('success');
      statusText.textContent = 'Done!';
      durationEl.style.display = 'none';
      break;

    case 'error':
      micBubble.classList.add('error');
      statusText.textContent = 'Error';
      durationEl.style.display = 'none';
      break;

    default:
      resetTimer();
      statusText.textContent = '';
  }

  console.log(`[Overlay] State changed to: ${state}`);
}

// ============ IPC Listeners ============
window.overlayAPI.onSetState((state) => {
  setState(state);
});

window.overlayAPI.onSetErrorMessage((message) => {
  if (message && statusText) {
    statusText.textContent = message;
  }
});

window.overlayAPI.onReset(() => {
  resetTimer();
  setState('recording');
});

// ============ Initialize ============
console.log('[Overlay] Overlay script loaded');
setState('recording');
