import type { ExtensionMessage, Problem, UserCode, SubmissionResult } from '../types';
import { platformDetector } from '../platforms/detector';
import { debounce } from '../utils/helpers';

let lastProblem: Problem | null = null;
let lastCode: UserCode | null = null;
let lastSubmission: SubmissionResult | null = null;
let observerActive = false;

function sendMessage(msg: ExtensionMessage): void {
  try {
    chrome.runtime.sendMessage(msg);
  } catch {
    // Extension context invalidated
  }
}

function extractAndSend(): void {
  const platform = platformDetector.detect();
  const problem = platform.extractProblem();
  const code = platform.extractUserCode();
  const submission = platform.extractSubmissionResult();

  if (problem && problem.title !== lastProblem?.title) {
    lastProblem = problem;
    // Background relays this and persists it under a per-tab storage key
    sendMessage({ type: 'PROBLEM_DETECTED', payload: { problem, platform: platform.platform } });
  }

  if (code && code.code !== lastCode?.code) {
    lastCode = code;
    sendMessage({ type: 'CODE_CHANGED', payload: { code, platform: platform.platform } });
  }

  if (submission && submission.status !== lastSubmission?.status) {
    lastSubmission = submission;
    sendMessage({ type: 'SUBMISSION_DETECTED', payload: { submission, platform: platform.platform } });
  }
}

const debouncedExtract = debounce(extractAndSend as () => void, 800);

function setupObserver(): void {
  if (observerActive) return;
  observerActive = true;

  const observer = new MutationObserver(() => {
    debouncedExtract();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false,
  });
}

// Floating button removed — use Ctrl+Shift+A or the extension icon to open the panel

// Listen for messages from background/sidebar
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'GET_PROBLEM') {
    const platform = platformDetector.detect();
    const problem = platform.extractProblem();
    const code = platform.extractUserCode();
    sendResponse({ problem, code, platform: platform.platform });
    return true;
  }

  if (message.type === 'GET_CODE') {
    const platform = platformDetector.detect();
    const code = platform.extractUserCode();
    sendResponse({ code });
    return true;
  }

  return false;
});

// Retry extraction with increasing delays — LeetCode renders slowly via React
function initWithRetries(): void {
  const delays = [500, 1500, 3000, 5000, 8000];

  delays.forEach((delay) => {
    setTimeout(() => {
      extractAndSend();
    }, delay);
  });

  // Set up observer after first attempt
  setTimeout(() => {
    setupObserver();
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWithRetries);
} else {
  initWithRetries();
}

// SPA navigation detection — LeetCode changes URL without full reload
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    lastProblem = null;
    lastCode = null;
    lastSubmission = null;

    // Retry after navigation with delays
    [1000, 2500, 4000].forEach((d) => setTimeout(extractAndSend, d));
  }
}).observe(document, { subtree: true, childList: true });
