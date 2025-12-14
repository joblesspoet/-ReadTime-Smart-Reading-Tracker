/**
 * Background Service Worker
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open a welcome page or instructions could go here
    console.log('ReadTime installed');
    // Initialize default settings logic here if needed, 
    // but we handle defaults in code usually.
    chrome.storage.sync.set({
        settings: {
            readingSpeed: 200,
            showBadge: true,
            showProgressBar: true,
            showResumeNotification: true
        }
    });
  }
});
