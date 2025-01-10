"use strict";
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
    },
    funAndWork: {
        fun: {
            waitTime: 5,
            accessDuration: 5,
        },
        work: {
            waitTime: 2,
            accessDuration: 30,
        },
    },
    socialMedia: {
        waitTime: 15,
        accessDuration: 5,
    },
};
let temporaryAllowances = {}; // Store temporary allowances with expiry timestamps and purpose
// Function to check all tabs and redirect if access has expired
async function checkExpiredAccess() {
    const now = Date.now();
    const expiredDomains = new Set();
    // Find expired domains
    for (const [domain, data] of Object.entries(temporaryAllowances)) {
        if (data.expiry < now) {
            delete temporaryAllowances[domain];
            expiredDomains.add(domain);
        }
    }
    // If there are expired domains, check all tabs
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
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        if (websiteCategories.fun.some((site) => new URL(site.url).hostname === domain)) {
            return "fun";
        }
        if (websiteCategories.funAndWork.some((site) => new URL(site.url).hostname === domain)) {
            return "funAndWork";
        }
        if (websiteCategories.socialMedia.some((site) => new URL(site.url).hostname === domain)) {
            return "socialMedia";
        }
        return null;
    }
    catch (error) {
        console.error("Error checking website category:", error);
        return null;
    }
}
// Check if a URL is temporarily allowed
function isTemporarilyAllowed(url) {
    try {
        const domain = new URL(url).hostname;
        const now = Date.now();
        return (Boolean(temporaryAllowances[domain]) &&
            temporaryAllowances[domain].expiry > now);
    }
    catch (error) {
        console.error("Error checking temporary allowance:", error);
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
});
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
// Message handling from popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case "CHECK_WEBSITE":
            if (request.url) {
                const category = checkWebsiteCategory(request.url);
                sendResponse({ category });
            }
            break;
        case "CHECK_ALLOWANCE":
            if (request.domain) {
                const now = Date.now();
                const allowance = temporaryAllowances[request.domain];
                if (allowance && allowance.expiry > now) {
                    sendResponse({
                        allowed: true,
                        expiry: allowance.expiry,
                        purpose: allowance.purpose,
                    });
                }
                else {
                    sendResponse({ allowed: false });
                }
            }
            break;
        case "ALLOW_TEMPORARILY":
            if (request.url) {
                try {
                    const domain = new URL(request.url).hostname;
                    const category = checkWebsiteCategory(request.url);
                    const purpose = request.purpose || "fun";
                    // Get the appropriate access duration based on category and purpose
                    let accessDuration = settings.fun.accessDuration;
                    if (category === "funAndWork") {
                        accessDuration =
                            purpose === "work"
                                ? settings.funAndWork.work.accessDuration
                                : settings.funAndWork.fun.accessDuration;
                    }
                    else if (category === "socialMedia") {
                        accessDuration = settings.socialMedia.accessDuration;
                    }
                    // Allow access for the configured duration
                    temporaryAllowances[domain] = {
                        expiry: Date.now() + accessDuration * 60 * 1000,
                        purpose: category === "socialMedia" ? "social" : purpose,
                    };
                    sendResponse({ success: true });
                }
                catch (error) {
                    console.error("Error setting temporary allowance:", error);
                    sendResponse({ success: false });
                }
            }
            break;
    }
    return true;
});
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
