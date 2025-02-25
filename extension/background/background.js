"use strict";
// Track video changes per domain
const videoChanges = {};
// Track tab audio status
const tabAudioStatus = {};
// Store for website categories and settings
let websiteCategories = {
    fun: [],
    funAndWork: [],
    socialMedia: [],
};
let settings = {
    fun: {
        waitTime: 5,
        accessDuration: 5,
        maxVideoChanges: 3,
    },
    funAndWork: {
        fun: {
            waitTime: 5,
            accessDuration: 5,
            maxVideoChanges: 3,
        },
        work: {
            waitTime: 2,
            accessDuration: 30,
            maxVideoChanges: 10,
        },
    },
    socialMedia: {
        waitTime: 15,
        accessDuration: 5,
        maxVideoChanges: 3,
    },
};
let temporaryAllowances = {};
// Store current mode
let currentMode = "fun";
// Function to check all tabs and redirect if access has expired
async function checkExpiredAccess() {
    const now = Date.now();
    const expiredDomains = new Set();
    // Find expired domains
    for (const [domain, data] of Object.entries(temporaryAllowances)) {
        // Only check expiry for time-based limits
        if (data.limitType === "time" && data.expiry < now) {
            delete temporaryAllowances[domain];
            expiredDomains.add(domain);
            // Reset video change counter when access expires
            if (videoChanges[domain]) {
                videoChanges[domain].count = 0;
            }
        }
    }
    // Check all tabs for expired domains
    if (expiredDomains.size > 0) {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.url) {
                try {
                    const domain = new URL(tab.url).hostname;
                    if (expiredDomains.has(domain)) {
                        const category = checkWebsiteCategory(tab.url);
                        if (category) {
                            const redirectUrl = chrome.runtime.getURL(`build/redirect.html?type=${category}&url=${encodeURIComponent(tab.url)}`);
                            chrome.tabs.update(tab.id, { url: redirectUrl });
                        }
                    }
                }
                catch (error) {
                    console.error("Error checking tab URL:", error);
                }
            }
        }
    }
}
// Set up alarm for periodic checks
chrome.alarms.create("checkExpiredAccess", { periodInMinutes: 0.1 }); // Check every 6 seconds
// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkExpiredAccess") {
        checkExpiredAccess();
    }
});
// Load website categories and settings from storage when extension starts
chrome.storage.local.get(["websiteCategories", "categorySettings"], (result) => {
    websiteCategories = result.websiteCategories || {
        fun: [],
        funAndWork: [],
        socialMedia: [],
    };
    settings = result.categorySettings || settings;
});
// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.websiteCategories) {
        websiteCategories = changes.websiteCategories.newValue;
    }
    if (changes.categorySettings) {
        settings = changes.categorySettings.newValue;
    }
});
// Helper function to check if a URL matches any website category
function checkWebsiteCategory(url) {
    try {
        // Make sure URL has a protocol
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        // Helper function to safely check domain match
        const domainMatches = (siteUrl, targetDomain) => {
            try {
                // Make sure site URL has a protocol
                if (!siteUrl.startsWith("http://") && !siteUrl.startsWith("https://")) {
                    siteUrl = "https://" + siteUrl;
                }
                const siteUrlObj = new URL(siteUrl);
                return siteUrlObj.hostname === targetDomain;
            }
            catch (error) {
                debugLog(`Invalid URL in website categories: ${siteUrl}`, error);
                return false;
            }
        };
        // Check each category with safe URL parsing
        for (const site of websiteCategories.fun) {
            if (domainMatches(site.url, domain)) {
                return "fun";
            }
        }
        for (const site of websiteCategories.funAndWork) {
            if (domainMatches(site.url, domain)) {
                return "funAndWork";
            }
        }
        for (const site of websiteCategories.socialMedia) {
            if (domainMatches(site.url, domain)) {
                return "socialMedia";
            }
        }
        return null;
    }
    catch (error) {
        debugLog("Error checking website category for URL: " + url, error);
        return null;
    }
}
// Check if a URL is temporarily allowed
function isTemporarilyAllowed(url) {
    // Return false if URL is undefined or null
    if (!url) {
        debugLog("isTemporarilyAllowed called with undefined or null URL");
        return false;
    }
    try {
        // Make sure URL has a protocol
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        const domain = new URL(url).hostname;
        const now = Date.now();
        return (Boolean(temporaryAllowances[domain]) &&
            temporaryAllowances[domain].expiry > now);
    }
    catch (error) {
        debugLog("Error checking temporary allowance for URL: " + url, error);
        return false;
    }
}
// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading" && tab.url) {
        // Skip if this is the redirect page
        if (tab.url.includes(chrome.runtime.getURL("")))
            return;
        // Skip if the URL is temporarily allowed
        if (isTemporarilyAllowed(tab.url))
            return;
        const category = checkWebsiteCategory(tab.url);
        if (category) {
            const redirectUrl = chrome.runtime.getURL(`build/redirect.html?type=${category}&url=${encodeURIComponent(tab.url)}`);
            chrome.tabs.update(tabId, { url: redirectUrl });
        }
    }
    // Check for audio status changes
    if (changeInfo.audible !== undefined) {
        const isAudible = changeInfo.audible || false;
        tabAudioStatus[tabId] = isAudible;
        // Notify content script about audio status change
        if (tab.url && !tab.url.startsWith("chrome-extension://")) {
            chrome.tabs
                .sendMessage(tabId, {
                type: "AUDIO_STATUS_CHANGED",
                isAudible: isAudible,
            })
                .catch((err) => {
                // Ignore errors from tabs that don't have our content script
            });
        }
    }
});
// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabAudioStatus[tabId];
});
// Check for tab audio and notify content script
function checkTabAudio() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            // Skip tabs without IDs or URLs
            if (!tab.id || !tab.url)
                return;
            // Skip extension pages
            if (tab.url.startsWith("chrome-extension://"))
                return;
            // Check if audio status changed
            const isAudible = tab.audible || false;
            const previousStatus = tabAudioStatus[tab.id] || false;
            // Update status
            tabAudioStatus[tab.id] = isAudible;
            // If status changed, notify content script
            if (isAudible !== previousStatus) {
                debugLog(`Tab ${tab.id} audio status changed to ${isAudible}`);
                // Send message to content script
                chrome.tabs
                    .sendMessage(tab.id, {
                    type: "AUDIO_STATUS_CHANGED",
                    isAudible: isAudible,
                })
                    .catch((err) => {
                    // Ignore errors from tabs that don't have our content script
                });
            }
        });
    });
}
// Set up periodic audio check
setInterval(checkTabAudio, 1000);
// Handle new tab creation
chrome.tabs.onCreated.addListener((tab) => {
    if (tab.url) {
        // Skip if the URL is temporarily allowed
        if (isTemporarilyAllowed(tab.url))
            return;
        const category = checkWebsiteCategory(tab.url);
        if (category) {
            const redirectUrl = chrome.runtime.getURL(`build/redirect.html?type=${category}&url=${encodeURIComponent(tab.url)}`);
            chrome.tabs.update(tab.id, { url: redirectUrl });
        }
    }
});
// Helper function to safely extract domain from URL
function safeGetDomain(url) {
    // Return null if URL is undefined or null
    if (!url) {
        debugLog("safeGetDomain called with undefined or null URL");
        return null;
    }
    try {
        // Make sure URL has a protocol
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        return new URL(url).hostname;
    }
    catch (error) {
        debugLog("Error extracting domain from URL: " + url, error);
        return null;
    }
}
// Add temporary allowance for a URL
function addTemporaryAllowance(url, limitType, purpose) {
    try {
        const domain = safeGetDomain(url);
        if (!domain) {
            debugLog("Could not extract domain from URL: " + url);
            return { success: false };
        }
        const category = checkWebsiteCategory("https://" + domain);
        if (category) {
            const categorySettings = category === "funAndWork"
                ? settings.funAndWork[currentMode]
                : settings[category];
            if (categorySettings) {
                const now = Date.now();
                temporaryAllowances[domain] = {
                    expiry: limitType === "time"
                        ? now + categorySettings.accessDuration * 60 * 1000
                        : Infinity,
                    purpose: purpose || "fun",
                    limitType: limitType,
                };
                // Reset video change counter when granting new access
                if (videoChanges[domain]) {
                    videoChanges[domain].count = 0;
                    debugLog(`Reset video count for ${domain} after granting temporary access`);
                }
                return { success: true };
            }
        }
    }
    catch (error) {
        console.error("Error processing temporary allowance:", error);
    }
    return { success: false };
}
// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    var _a;
    debugLog("Received message:", message);
    // Handle different message types
    if (message.type === "VIDEO_CHANGED") {
        debugLog("Received VIDEO_CHANGED message from tab " + ((_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id), message);
        // Extract the URL, change count, and video info from the message
        const url = message.url;
        const changeCount = message.changeCount || 1;
        const videoInfo = message.videoInfo || {};
        // Call the handleVideoChange function with the extracted data
        handleVideoChange(url, changeCount, videoInfo);
    }
    else if (message.type === "ALLOW_TEMPORARILY") {
        // Handle temporary allowance requests
        const url = message.url;
        const limitType = message.limitType;
        const purpose = message.purpose;
        // Add temporary allowance
        const result = addTemporaryAllowance(url, limitType, purpose);
        sendResponse(result);
    }
    else if (message.type === "CHECK_ALLOWANCE") {
        // Check if a URL is temporarily allowed
        if (!message.url && message.domain) {
            // If we have a domain but no URL, construct a URL from the domain
            const domain = message.domain;
            const url = `https://${domain}`;
            const isAllowed = isTemporarilyAllowed(url);
            sendResponse({ isAllowed });
        }
        else if (message.url) {
            // If we have a URL, use it directly
            const isAllowed = isTemporarilyAllowed(message.url);
            sendResponse({ isAllowed });
        }
        else {
            // If we have neither URL nor domain, return false
            debugLog("CHECK_ALLOWANCE message missing both url and domain", message);
            sendResponse({ isAllowed: false });
        }
    }
    else if (message.type === "DEBUG_LOG") {
        // Log debug messages from content scripts
        console.log(message.message);
    }
    // Return true to indicate that we will send a response asynchronously
    return true;
});
// Debug logging function
function debugLog(message, data) {
    console.log(`[Background] ${message}`, data || "");
}
// Installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        // Set default settings on installation
        const defaultSettings = {
            websiteCategories: {
                fun: [],
                funAndWork: [],
                socialMedia: [],
            },
            categorySettings: settings,
        };
        chrome.storage.local.set(defaultSettings, () => {
            console.log("Default settings installed");
        });
    }
});
// Debounce function to prevent rapid redirects
function debounce(func, wait) {
    let timeout = null;
    return (...args) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
            timeout = null;
        }, wait);
    };
}
// Handle video change with debouncing
const handleVideoChangeDebounced = debounce((url, tabId) => {
    const category = checkWebsiteCategory(url);
    // Only redirect for video changes if:
    // 1. The website is in a category
    // 2. It's not temporarily allowed
    // 3. It's not in work mode for funAndWork sites
    if (category && !isTemporarilyAllowed(url)) {
        if (category === "funAndWork" && currentMode === "work") {
            // Don't redirect if in work mode for funAndWork sites
            return;
        }
        const redirectUrl = chrome.runtime.getURL(`build/redirect.html?type=${category}&url=${encodeURIComponent(url)}`);
        chrome.tabs.update(tabId, { url: redirectUrl });
    }
}, 1000); // 1 second debounce
// Helper function to get settings for a category
function getCategorySettings(category) {
    switch (category) {
        case "fun":
            return settings.fun;
        case "funAndWork":
            return currentMode === "work"
                ? settings.funAndWork.work
                : settings.funAndWork.fun;
        case "socialMedia":
            return settings.socialMedia;
        default:
            return null;
    }
}
// Handle video change messages from content script
function handleVideoChange(url, changeCount, videoInfo) {
    // Safely extract domain
    const domain = safeGetDomain(url);
    if (!domain) {
        debugLog("Could not extract domain from URL: " + url);
        return;
    }
    // Special handling for YouTube - only count video changes on watch or shorts pages
    if (domain === "youtube.com" ||
        domain === "www.youtube.com" ||
        domain === "m.youtube.com") {
        // Check if this is a watch page or shorts page
        const isWatchPage = url.includes("/watch") || url.includes("/shorts");
        if (!isWatchPage) {
            debugLog(`Ignoring video change on non-watch/shorts YouTube page: ${url}`);
            return;
        }
    }
    // Initialize video change tracker for this domain if needed
    if (!videoChanges[domain]) {
        videoChanges[domain] = {
            count: 0,
            lastChangeTime: Date.now(),
        };
    }
    // Log previous count before updating
    const previousCount = videoChanges[domain].count;
    // Instead of setting the count directly from the message,
    // increment it by 1 for each video change notification
    videoChanges[domain].count += 1;
    videoChanges[domain].lastChangeTime = Date.now();
    // Log the change in count
    debugLog(`Video count for ${domain}: ${previousCount} → ${videoChanges[domain].count} (from content: ${changeCount})`);
    // Check if we need to take action based on video changes
    const category = checkWebsiteCategory("https://" + domain);
    if (!category) {
        debugLog(`No category found for domain: ${domain}, ignoring video change`);
        return;
    }
    // Get settings for this category
    let categorySettings;
    if (category === "funAndWork") {
        categorySettings = settings.funAndWork[currentMode];
    }
    else {
        categorySettings = settings[category];
    }
    // Check if we've exceeded the maximum allowed video changes
    // Ignore initial changes based on settings
    if (videoChanges[domain].count > categorySettings.maxVideoChanges) {
        debugLog(`Excessive video changes detected for ${domain}: ${videoChanges[domain].count} (limit: ${categorySettings.maxVideoChanges})`);
        // Only block if not in work mode for funAndWork sites
        if (category === "funAndWork" && currentMode === "work") {
            debugLog("Allowing video change - work mode for funAndWork site");
            return;
        }
        // Get the tab ID from the most recent message
        chrome.tabs.query({ url: `*://${domain}/*` }, (tabs) => {
            if (tabs.length > 0) {
                const tabId = tabs[0].id;
                if (tabId) {
                    debugLog(`Blocking tab ${tabId} due to too many video changes`);
                    const redirectUrl = chrome.runtime.getURL(`build/redirect.html?type=${category}&url=${encodeURIComponent(url)}`);
                    chrome.tabs.update(tabId, { url: redirectUrl }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("Error redirecting:", chrome.runtime.lastError);
                        }
                        else {
                            debugLog("Successfully redirected to block screen");
                        }
                    });
                }
            }
        });
    }
}
