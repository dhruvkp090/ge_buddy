// Store for website categories
let websiteCategories = {
  fun: [],
  funAndWork: []
};

// Load website categories from storage when extension starts
chrome.storage.local.get(['websiteCategories'], (result) => {
  websiteCategories = result.websiteCategories || { fun: [], funAndWork: [] };
});

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.websiteCategories) {
    websiteCategories = changes.websiteCategories.newValue;
  }
});

// Helper function to check if a URL matches any website category
function checkWebsiteCategory(url) {
  const urlObj = new URL(url);
  const domain = urlObj.hostname;

  if (websiteCategories.fun.some(site => new URL(site.url).hostname === domain)) {
    return 'fun';
  }
  if (websiteCategories.funAndWork.some(site => new URL(site.url).hostname === domain)) {
    return 'funAndWork';
  }
  return null;
}

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const category = checkWebsiteCategory(tab.url);
    if (category) {
      const redirectUrl = chrome.runtime.getURL(`build/redirect.html?type=${category}&url=${encodeURIComponent(tab.url)}`);
      chrome.tabs.update(tabId, { url: redirectUrl });
    }
  }
});

// Handle new tab creation
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url) {
    const category = checkWebsiteCategory(tab.url);
    if (category) {
      const redirectUrl = chrome.runtime.getURL(`build/redirect.html?type=${category}&url=${encodeURIComponent(tab.url)}`);
      chrome.tabs.update(tab.id, { url: redirectUrl });
    }
  }
});

// Message handling from popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'CHECK_WEBSITE':
      if (request.url) {
        const category = checkWebsiteCategory(request.url);
        sendResponse({ category });
      }
      break;
  }
  return true;
});

// Installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings on installation
    const defaultSettings = {
      websiteCategories: {
        fun: [],
        funAndWork: []
      }
    };
    
    chrome.storage.local.set(defaultSettings, () => {
      console.log('Default settings installed');
    });
  }
});

// Error handling
chrome.runtime.lastError && console.error(chrome.runtime.lastError); 