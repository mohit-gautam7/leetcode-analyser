import type { ExtensionMessage, Problem, UserCode } from '../types';

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Enable side panel for all supported tabs
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  const supportedPatterns = [
    'leetcode.com',
    'geeksforgeeks.org',
    'codeforces.com',
    'codechef.com',
    'atcoder.jp',
    'hackerrank.com',
    'codingninjas.com',
    'naukri.com/code360',
    'interviewbit.com',
    'cses.fi',
    'spoj.com',
  ];

  const isSupported = supportedPatterns.some((p) => tab.url?.includes(p));

  if (isSupported) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidebar.html',
      enabled: true,
    });
  } else {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false,
    });
  }
});

// Message handling between content script and sidebar
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return true;
  }

  if (message.type === 'OPEN_SIDEBAR') {
    const tabId = sender.tab?.id ?? message.tabId;
    if (tabId) {
      chrome.sidePanel.open({ tabId }).catch(console.error);
    }
    sendResponse({ success: true });
    return true;
  }

  // Relay messages from content script to sidebar, tagged with the source tab
  // so each window's panel only reacts to its own active tab's problem.
  if (message.type === 'PROBLEM_DETECTED' || message.type === 'CODE_CHANGED' || message.type === 'SUBMISSION_DETECTED') {
    const tabId = sender.tab?.id ?? message.tabId;
    if (tabId != null) {
      const payload = message.payload as { problem?: Problem; code?: UserCode } | undefined;
      if (message.type === 'PROBLEM_DETECTED' && payload?.problem) {
        chrome.storage.local.set({ [`problem_${tabId}`]: payload.problem });
      }
      if (message.type === 'CODE_CHANGED' && payload?.code) {
        chrome.storage.local.set({ [`code_${tabId}`]: payload.code });
      }
      chrome.runtime.sendMessage({ ...message, tabId }).catch(() => {/* no sidebar open yet */});
    }
    sendResponse({ received: true });
    return true;
  }

  return false;
});

// Clean up tab-scoped storage when a tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`problem_${tabId}`, `code_${tabId}`]);
});

// Handle keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  }
});

console.log('[CodeSense AI] Background service worker started');
