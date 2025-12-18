/**
 * Background Service Worker for XSS Risk Detector
 * Manages extension lifecycle and message passing
 */

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('XSS Risk Detector extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getEvidence') {
    // Forward request to content script of active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'collectEvidence' }, (response) => {
          sendResponse(response || { evidence: [], error: 'No response from content script' });
        });
      } else {
        sendResponse({ evidence: [], error: 'No active tab' });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'injectCollector') {
    // Inject content script into active tab if not already present
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['src/content.js']
          });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'No active tab' });
      }
    });
    return true;
  }
});

// Listen for tab updates to reset state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab loaded:', tab.url);
  }
});
