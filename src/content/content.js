/**
 * Content Script Loader
 * Dynamically imports the main logic to enable ES Module support/
 */
(async () => {
    const src = chrome.runtime.getURL('src/content/main.js');
    await import(src);
})();
