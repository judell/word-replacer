// browser-polyfill.js
const browserAPI = (() => {
  // Firefox already has the browser API
  if (typeof browser !== 'undefined') {
    // Add a small wrapper to ensure consistent behavior
    return {
      ...browser,
      runtime: {
        ...browser.runtime,
        onMessage: {
          addListener: (callback) => {
            browser.runtime.onMessage.addListener((message, sender) => {
              return Promise.resolve(callback(message, sender));
            });
          }
        }
      }
    };
  }

  // Chrome API wrapper
  const api = {};
  
  api.storage = {
    local: {
      get: (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve)),
      set: (items) => new Promise((resolve) => chrome.storage.local.set(items, resolve))
    }
  };
  
  api.tabs = {
    query: (queryInfo) => new Promise((resolve) => chrome.tabs.query(queryInfo, resolve)),
    sendMessage: (tabId, message) => new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    })
  };
  
  api.runtime = {
    onMessage: {
      addListener: (callback) => {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          Promise.resolve(callback(message, sender))
            .then(sendResponse)
            .catch((error) => sendResponse({ error: error.message }));
          return true;
        });
      }
    },
    getManifest: () => chrome.runtime.getManifest()
  };
  
  return api;
})();