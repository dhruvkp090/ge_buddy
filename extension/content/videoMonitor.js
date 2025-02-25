"use strict";
// Track states and playback status
const videoStates = new WeakMap();
const knownIframes = new Map(); // Map iframe element ID to its current src
let changeCount = 0;
let hasInitialPlayback = false;
let allMediaElements = [];
let lastVideoChangeTime = 0;
let lastUrl = window.location.href; // Track the current URL
let lastPageTitle = document.title; // Track the page title
let lastMetaData = {}; // Track metadata
let forceScanInterval = null; // For aggressive scanning
let isTabAudible = false; // Track tab audio status
// Listen for audio status messages from background script
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "AUDIO_STATUS_CHANGED") {
        const wasAudible = isTabAudible;
        isTabAudible = message.isAudible;
        debugLog(`Tab audio status changed: ${isTabAudible}`);
        // If audio just started and we have no active videos detected,
        // this might indicate a hidden video player - scan more aggressively
        if (isTabAudible && !wasAudible) {
            debugLog("Audio detected - scanning for hidden players");
            scanForHiddenPlayers();
            startAggressiveScanning();
            // If we don't have any visible videos but audio is playing,
            // consider this a potential video change
            if (allMediaElements.length === 0) {
                debugLog("Audio detected but no visible videos - treating as potential video change");
                // Check for metadata changes that might indicate a new video
                const currentMetadata = extractMetadata();
                const metadataChanged = hasMetadataChanged(lastMetaData, currentMetadata);
                if (metadataChanged) {
                    debugLog("Metadata changed with audio - likely video change");
                    // Notify about video change
                    const now = Date.now();
                    if (now - lastVideoChangeTime > 500) {
                        lastVideoChangeTime = now;
                        changeCount++;
                        // Extract video ID if possible
                        const extracted = extractVideoId(window.location.href);
                        // Notify background script
                        chrome.runtime.sendMessage({
                            type: "VIDEO_CHANGED",
                            url: window.location.href,
                            changeCount: changeCount,
                            previousUrl: lastUrl,
                            videoInfo: {
                                videoId: extracted.videoId,
                                platform: extracted.platform,
                                pageTitle: document.title,
                                previousTitle: lastPageTitle,
                                hasActiveVideos: false,
                                isAudible: true,
                                source: "audio_detection",
                            },
                        });
                    }
                    // Update metadata tracking
                    lastMetaData = currentMetadata;
                }
            }
        }
        // If audio just stopped, this might indicate a video change or end
        if (!isTabAudible && wasAudible) {
            debugLog("Audio stopped - possible video change or end");
            setTimeout(() => {
                // If audio is still off after a short delay, check for video changes
                if (!isTabAudible) {
                    checkPageChanges();
                }
            }, 500);
        }
    }
});
// Scan for hidden video players that might be in iframes or shadow DOM
function scanForHiddenPlayers() {
    debugLog("Scanning for hidden video players");
    // Look for iframes that might contain videos
    document.querySelectorAll("iframe").forEach((iframe) => {
        try {
            handleIframeChange(iframe);
        }
        catch (e) {
            // Ignore cross-origin errors
        }
    });
    // Look for shadow DOM elements
    document.querySelectorAll("*").forEach((element) => {
        if (element.shadowRoot) {
            observeShadowRoot(element.shadowRoot);
        }
    });
    // Look for elements that might be custom video players
    const potentialPlayers = document.querySelectorAll('[class*="player"], [class*="video"], [class*="media"], [id*="player"], [id*="video"], [id*="media"], video, audio, [role="application"]');
    if (potentialPlayers.length > 0) {
        debugLog(`Found ${potentialPlayers.length} potential custom players`);
    }
    // Check if clicking these elements might reveal videos
    potentialPlayers.forEach((element) => {
        // Just observe them for now, don't actually click
        const observer = new MutationObserver(() => {
            monitorElements();
        });
        observer.observe(element, {
            childList: true,
            subtree: true,
            attributes: true,
        });
    });
    // Also look for HTML5 audio elements
    const audioElements = document.querySelectorAll("audio");
    if (audioElements.length > 0) {
        debugLog(`Found ${audioElements.length} audio elements`);
    }
    audioElements.forEach((audio) => {
        // Monitor audio element changes
        const observer = new MutationObserver(() => {
            // If audio is playing and we detect a change, consider it a video change
            if (!audio.paused && isTabAudible) {
                checkPageChanges();
            }
        });
        observer.observe(audio, {
            attributes: true,
            attributeFilter: ["src", "currentSrc"],
        });
        // Listen for play events
        audio.addEventListener("play", () => {
            if (isTabAudible) {
                checkPageChanges();
            }
        });
    });
}
// Platform-specific video ID extraction patterns
const platformPatterns = {
    youtube: {
        videoIdRegex: /(?:v=|\/embed\/|\/v\/|youtu\.be\/|\/watch\?v=|\/watch\?.+&v=)([^#&?\/]+)/i,
        domain: /youtube\.com|youtu\.be/i,
        titleSelector: ".title.ytd-video-primary-info-renderer, .ytp-title-link",
    },
    vimeo: {
        videoIdRegex: /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i,
        domain: /vimeo\.com/i,
        titleSelector: ".vp-title",
    },
    facebook: {
        videoIdRegex: /facebook\.com\/.*\/videos\/([0-9]+)/i,
        domain: /facebook\.com/i,
        titleSelector: ".pvs-header-actions__title",
    },
    netflix: {
        videoIdRegex: /netflix\.com\/watch\/(\d+)/i,
        domain: /netflix\.com/i,
        titleSelector: ".video-title, .title-logo",
    },
    hulu: {
        videoIdRegex: /hulu\.com\/watch\/(\d+)/i,
        domain: /hulu\.com/i,
        titleSelector: ".metadata-area__second-line",
    },
    // Add more platforms as needed
};
// Important metadata tags to monitor
const metadataTags = [
    "og:title",
    "og:video",
    "og:video:url",
    "og:video:secure_url",
    "og:video:type",
    "og:video:width",
    "og:video:height",
    "twitter:player",
    "twitter:title",
    "video:duration",
    "video:release_date",
    "article:published_time",
];
function debugLog(message, data) {
    const logMessage = `[VideoMonitor] ${message} ${data ? JSON.stringify(data) : ""}`;
    chrome.runtime.sendMessage({ type: "DEBUG_LOG", message: logMessage });
}
// Extract metadata from the page
function extractMetadata() {
    const metadata = {};
    // Get Open Graph and other metadata
    const metaTags = document.querySelectorAll("meta[property], meta[name]");
    metaTags.forEach((tag) => {
        const property = tag.getAttribute("property") || tag.getAttribute("name");
        const content = tag.getAttribute("content");
        if (property && content && metadataTags.includes(property)) {
            metadata[property] = content;
        }
    });
    // Get JSON-LD data if available
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach((script, index) => {
        try {
            const data = JSON.parse(script.textContent || "{}");
            if (data["@type"] === "VideoObject" ||
                data["@type"] === "Movie" ||
                data["@type"] === "TVEpisode") {
                metadata[`jsonld_${index}_name`] = data.name || "";
                metadata[`jsonld_${index}_url`] = data.url || "";
                metadata[`jsonld_${index}_id`] = data.identifier || data["@id"] || "";
            }
        }
        catch (e) {
            // Ignore JSON parse errors
        }
    });
    return metadata;
}
// Check if metadata has changed significantly
function hasMetadataChanged(oldMeta, newMeta) {
    // Check for changes in video-specific metadata
    const videoKeys = [
        "og:video",
        "og:video:url",
        "twitter:player",
        "video:duration",
    ];
    for (const key of videoKeys) {
        if (oldMeta[key] !== newMeta[key] && (oldMeta[key] || newMeta[key])) {
            return true;
        }
    }
    // Check for title changes
    if (oldMeta["og:title"] !== newMeta["og:title"] &&
        (oldMeta["og:title"] || newMeta["og:title"])) {
        return true;
    }
    // Check JSON-LD changes
    const jsonLdKeys = Object.keys(newMeta).filter((k) => k.startsWith("jsonld_"));
    for (const key of jsonLdKeys) {
        if (oldMeta[key] !== newMeta[key] && (oldMeta[key] || newMeta[key])) {
            return true;
        }
    }
    return false;
}
// Check if URL has changed in a way that indicates a new video
function hasUrlChanged(oldUrl, newUrl) {
    if (oldUrl === newUrl)
        return false;
    try {
        const oldUrlObj = new URL(oldUrl);
        const newUrlObj = new URL(newUrl);
        // Different domains definitely means different video
        if (oldUrlObj.hostname !== newUrlObj.hostname)
            return true;
        // Check for path changes that indicate a new video
        if (oldUrlObj.pathname !== newUrlObj.pathname)
            return true;
        // For YouTube and similar sites, check if video ID in query params changed
        const oldVideoId = extractVideoIdFromUrl(oldUrl);
        const newVideoId = extractVideoIdFromUrl(newUrl);
        if (oldVideoId && newVideoId && oldVideoId !== newVideoId)
            return true;
        // Check for hash changes that might indicate a new video (like YouTube timestamps)
        if (oldUrlObj.hash !== newUrlObj.hash) {
            // Only count significant hash changes (not just timestamp changes)
            // For example, YouTube uses #t=123 for timestamps
            const oldHash = oldUrlObj.hash.replace(/[#&]t=\d+/, "");
            const newHash = newUrlObj.hash.replace(/[#&]t=\d+/, "");
            if (oldHash !== newHash)
                return true;
        }
        return false;
    }
    catch (e) {
        // If URL parsing fails, assume it's changed
        return true;
    }
}
// Extract video ID directly from URL
function extractVideoIdFromUrl(url) {
    if (!url)
        return null;
    for (const [platform, pattern] of Object.entries(platformPatterns)) {
        if (pattern.domain.test(url)) {
            const match = url.match(pattern.videoIdRegex);
            if (match && match[1]) {
                return match[1];
            }
        }
    }
    return null;
}
function isVideoIframe(src) {
    const url = src.toLowerCase();
    return (url.includes("/embed") ||
        url.includes("/player") ||
        url.includes("watch") ||
        url.includes("video") ||
        url.includes("stream") ||
        url.includes("media") ||
        url.includes("play"));
}
// Extract video ID from URL based on platform
function extractVideoId(url) {
    if (!url)
        return { videoId: null, platform: null };
    // Check each platform pattern
    for (const [platform, pattern] of Object.entries(platformPatterns)) {
        if (pattern.domain.test(url)) {
            const match = url.match(pattern.videoIdRegex);
            if (match && match[1]) {
                return { videoId: match[1], platform };
            }
        }
    }
    // Generic fallback - use the URL as the ID
    try {
        return {
            videoId: url.split("?")[0],
            platform: new URL(url).hostname,
        };
    }
    catch (e) {
        return { videoId: null, platform: null };
    }
}
// Try to get the video title from platform-specific selectors
function getPlatformSpecificTitle() {
    const currentUrl = window.location.href;
    for (const [platform, pattern] of Object.entries(platformPatterns)) {
        if (pattern.domain.test(currentUrl) && pattern.titleSelector) {
            const titleElement = document.querySelector(pattern.titleSelector);
            if (titleElement && titleElement.textContent) {
                return titleElement.textContent.trim();
            }
        }
    }
    return "";
}
function getVideoState(video) {
    // Try to get a title for the video from various sources
    let title = "";
    let videoId = undefined;
    let platform = undefined;
    // Check for title attribute
    if (video.hasAttribute("title")) {
        title = video.getAttribute("title") || "";
    }
    // Check for aria-label
    if (!title && video.hasAttribute("aria-label")) {
        title = video.getAttribute("aria-label") || "";
    }
    // Check for parent elements that might have a title
    if (!title) {
        const parent = video.parentElement;
        if (parent && parent.hasAttribute("title")) {
            title = parent.getAttribute("title") || "";
        }
    }
    // Try platform-specific title selectors
    if (!title) {
        title = getPlatformSpecificTitle();
    }
    // Try to get video ID from the source
    const src = video.currentSrc || video.src;
    if (src) {
        const extracted = extractVideoId(src);
        videoId = extracted.videoId || undefined;
        platform = extracted.platform || undefined;
    }
    // If no direct source, try to find it from the page URL
    if (!videoId) {
        const extracted = extractVideoId(window.location.href);
        videoId = extracted.videoId || undefined;
        platform = extracted.platform || undefined;
    }
    // Get current metadata
    const metaData = extractMetadata();
    return {
        src: src,
        currentTime: video.currentTime,
        isPlaying: !video.paused,
        title: title,
        duration: video.duration || 0,
        videoId: videoId,
        platform: platform,
        pageTitle: document.title,
        metaData: metaData,
    };
}
function hasVideoChanged(currentState, previousState) {
    if (!previousState)
        return true; // New video
    // Consider tab audio status in our detection
    if (isTabAudible && !previousState.isPlaying && currentState.isPlaying) {
        debugLog("Video started playing with audio", {
            isPlaying: currentState.isPlaying,
            isAudible: isTabAudible,
        });
        return true;
    }
    // Consider it a change if:
    // 1. The source has changed OR
    // 2. The video ID has changed OR
    // 3. The video has started playing from beginning after being loaded OR
    // 4. The title has changed (indicating a new video in the same player) OR
    // 5. The duration has changed significantly (indicating a new video) OR
    // 6. The page title has changed significantly OR
    // 7. The metadata has changed significantly
    // Check for source or video ID changes
    if (currentState.src !== previousState.src) {
        debugLog("Video source changed", {
            from: previousState.src,
            to: currentState.src,
        });
        return true;
    }
    if (currentState.videoId &&
        previousState.videoId &&
        currentState.videoId !== previousState.videoId) {
        debugLog("Video ID changed", {
            from: previousState.videoId,
            to: currentState.videoId,
        });
        return true;
    }
    // Check for playback state changes
    if (currentState.isPlaying &&
        !previousState.isPlaying &&
        currentState.currentTime < 1) {
        debugLog("Video started playing from beginning", {
            isPlaying: currentState.isPlaying,
            currentTime: currentState.currentTime,
        });
        return true;
    }
    // Check for title changes
    if (currentState.title !== undefined &&
        previousState.title !== undefined &&
        currentState.title !== previousState.title &&
        currentState.title !== "") {
        debugLog("Video title changed", {
            from: previousState.title,
            to: currentState.title,
        });
        return true;
    }
    // Check for significant duration changes
    if (Math.abs((currentState.duration || 0) - (previousState.duration || 0)) > 1) {
        debugLog("Video duration changed significantly", {
            from: previousState.duration,
            to: currentState.duration,
        });
        return true;
    }
    // Only check page title and metadata if the video is playing or tab has audio
    if (currentState.isPlaying || isTabAudible) {
        // Check for page title changes (many sites update title with video name)
        if (currentState.pageTitle !== previousState.pageTitle &&
            currentState.pageTitle &&
            previousState.pageTitle) {
            // Ignore minor changes like "(1)" notifications
            const cleanOldTitle = previousState.pageTitle.replace(/^\(\d+\)\s+/, "");
            const cleanNewTitle = currentState.pageTitle.replace(/^\(\d+\)\s+/, "");
            if (cleanOldTitle !== cleanNewTitle) {
                debugLog("Page title changed", {
                    from: previousState.pageTitle,
                    to: currentState.pageTitle,
                });
                return true;
            }
        }
        // Check for metadata changes
        if (currentState.metaData &&
            previousState.metaData &&
            hasMetadataChanged(previousState.metaData, currentState.metaData)) {
            debugLog("Video metadata changed", {
                from: previousState.metaData,
                to: currentState.metaData,
            });
            return true;
        }
    }
    return false;
}
// Check for page changes that indicate a new video
function checkPageChanges() {
    // Consider tab audio status in our detection
    const hasActiveVideos = allMediaElements.length > 0 && hasInitialPlayback;
    const audioChanged = isTabAudible; // If tab is audible, consider it a signal
    // Check URL changes - these are always relevant
    const currentUrl = window.location.href;
    const urlChanged = hasUrlChanged(lastUrl, currentUrl);
    // Check title and metadata changes - only if we have active videos or audio
    let titleChanged = false;
    let metadataChanged = false;
    // Always check metadata if audio is playing, even without visible videos
    if (hasActiveVideos || audioChanged) {
        // Check title changes
        const currentTitle = document.title;
        titleChanged = currentTitle !== lastPageTitle;
        // Check metadata changes
        const currentMetadata = extractMetadata();
        metadataChanged = hasMetadataChanged(lastMetaData, currentMetadata);
        // Update tracked state for title and metadata
        lastPageTitle = currentTitle;
        lastMetaData = currentMetadata;
    }
    // If any significant change is detected
    if (urlChanged ||
        ((hasActiveVideos || audioChanged) && (titleChanged || metadataChanged))) {
        debugLog("Page change detected", {
            hasActiveVideos,
            audioChanged,
            urlChanged,
            titleChanged: titleChanged
                ? { from: lastPageTitle, to: document.title }
                : false,
            metadataChanged,
        });
        // Prevent counting rapid changes
        const now = Date.now();
        if (now - lastVideoChangeTime > 500) {
            lastVideoChangeTime = now;
            changeCount++;
            // Extract video ID if possible
            const extracted = extractVideoId(currentUrl);
            // Notify background script
            chrome.runtime.sendMessage({
                type: "VIDEO_CHANGED",
                url: currentUrl,
                changeCount: changeCount,
                previousUrl: lastUrl,
                videoInfo: {
                    videoId: extracted.videoId,
                    platform: extracted.platform,
                    pageTitle: document.title,
                    previousTitle: lastPageTitle,
                    hasActiveVideos: hasActiveVideos,
                    isAudible: isTabAudible,
                    source: audioChanged && !hasActiveVideos
                        ? "audio_detection"
                        : "video_detection",
                },
            });
            // Start aggressive scanning for a short period after a page change
            startAggressiveScanning();
        }
    }
    // Always update URL tracking
    lastUrl = currentUrl;
}
// Start aggressive scanning for video changes for a short period
function startAggressiveScanning() {
    // Only start aggressive scanning if we have videos to scan
    if (allMediaElements.length === 0) {
        return;
    }
    // Clear any existing interval
    if (forceScanInterval !== null) {
        clearInterval(forceScanInterval);
    }
    // Scan all videos more frequently for the next few seconds
    forceScanInterval = window.setInterval(() => {
        allMediaElements.forEach((video) => {
            handleVideoChange(video);
        });
    }, 200);
    // Stop aggressive scanning after 5 seconds
    setTimeout(() => {
        if (forceScanInterval !== null) {
            clearInterval(forceScanInterval);
            forceScanInterval = null;
        }
    }, 5000);
}
function handleVideoChange(video) {
    const currentState = getVideoState(video);
    const previousState = videoStates.get(video);
    // Wait for initial playback
    if (!hasInitialPlayback) {
        if (currentState.isPlaying && currentState.currentTime > 0) {
            hasInitialPlayback = true;
            debugLog("Initial video playback detected", currentState);
        }
        videoStates.set(video, currentState);
        return;
    }
    if (hasVideoChanged(currentState, previousState)) {
        // Prevent counting rapid changes (e.g., seeking within the same video)
        const now = Date.now();
        if (now - lastVideoChangeTime < 500) {
            debugLog("Ignoring rapid change", {
                timeSinceLastChange: now - lastVideoChangeTime,
            });
            videoStates.set(video, currentState);
            return;
        }
        lastVideoChangeTime = now;
        changeCount++;
        debugLog("Video change detected!", {
            changeCount,
            previousState,
            currentState,
        });
        videoStates.set(video, currentState);
        // Notify background script
        chrome.runtime.sendMessage({
            type: "VIDEO_CHANGED",
            url: window.location.href,
            changeCount: changeCount,
            videoInfo: {
                src: currentState.src,
                title: currentState.title,
                duration: currentState.duration,
                videoId: currentState.videoId,
                platform: currentState.platform,
                pageTitle: currentState.pageTitle,
            },
        });
    }
    else {
        // Update the state even if it hasn't changed significantly
        videoStates.set(video, currentState);
    }
}
function handleIframeChange(iframe) {
    // Ensure iframe has an ID for tracking
    if (!iframe.id) {
        iframe.id = "monitor_" + Math.random().toString(36).substr(2, 9);
    }
    const iframeSrc = iframe.src;
    // Only track video iframes
    if (!isVideoIframe(iframeSrc)) {
        return;
    }
    // Get previous src for this iframe
    const previousSrc = knownIframes.get(iframe.id);
    // If this is a new iframe or src has changed
    if (iframeSrc !== previousSrc) {
        // For initial load, just record the iframe
        if (!hasInitialPlayback) {
            knownIframes.set(iframe.id, iframeSrc);
            return;
        }
        // If we've had initial playback and this is a new src, count it as a change
        if (previousSrc) {
            // Prevent counting rapid changes
            const now = Date.now();
            if (now - lastVideoChangeTime < 500) {
                knownIframes.set(iframe.id, iframeSrc);
                return;
            }
            lastVideoChangeTime = now;
            changeCount++;
            debugLog("Video change detected via iframe!", {
                changeCount,
                previousSrc,
                newSrc: iframeSrc,
            });
            // Extract video ID if possible
            const extracted = extractVideoId(iframeSrc);
            // Notify background script
            chrome.runtime.sendMessage({
                type: "VIDEO_CHANGED",
                url: window.location.href,
                changeCount: changeCount,
                iframeSrc: iframeSrc,
                previousIframeSrc: previousSrc,
                videoInfo: {
                    videoId: extracted.videoId,
                    platform: extracted.platform,
                },
            });
        }
        // Update known iframe src
        knownIframes.set(iframe.id, iframeSrc);
    }
}
function setupVideoMonitoring(video) {
    // Skip if we're already monitoring this video
    if (videoStates.has(video)) {
        return;
    }
    // Add to our list of tracked media elements
    if (!allMediaElements.includes(video)) {
        allMediaElements.push(video);
        debugLog("Added new video to monitoring", {
            totalVideos: allMediaElements.length,
            src: video.src || video.currentSrc || "no source",
        });
    }
    // Set initial state
    videoStates.set(video, getVideoState(video));
    // Monitor all relevant video events
    const events = [
        "loadstart",
        "loadeddata",
        "play",
        "playing",
        "seeked",
        "durationchange",
        "ratechange",
        "canplay",
        "timeupdate",
        "ended",
        "pause", // When playback is paused
    ];
    events.forEach((event) => {
        video.addEventListener(event, () => handleVideoChange(video));
    });
    // Also monitor the src attribute directly
    const srcObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === "src") {
                handleVideoChange(video);
            }
        });
    });
    srcObserver.observe(video, {
        attributes: true,
        attributeFilter: ["src"],
    });
    // Add a removal listener to clean up when video is removed from DOM
    const videoRemovalObserver = new MutationObserver((mutations) => {
        if (!document.body.contains(video)) {
            cleanupVideoMonitoring(video);
            videoRemovalObserver.disconnect();
        }
    });
    videoRemovalObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });
    debugLog("Started monitoring video", {
        src: video.src,
        currentSrc: video.currentSrc,
    });
}
// Clean up monitoring for a video that's been removed
function cleanupVideoMonitoring(video) {
    const index = allMediaElements.indexOf(video);
    if (index !== -1) {
        allMediaElements.splice(index, 1);
        debugLog("Removed video from monitoring", {
            remainingVideos: allMediaElements.length,
        });
    }
    // If we have no videos left, reset the change counter
    if (allMediaElements.length === 0) {
        debugLog("No videos left on page, resetting change counter");
        changeCount = 0;
    }
}
// Monitor both videos and iframes, including in shadow DOM
function monitorElements() {
    // Get all elements including those in shadow DOM
    const allElements = getShadowElements(document);
    // Find all video elements
    const videos = allElements.filter((el) => el.tagName === "VIDEO");
    videos.forEach((video) => {
        setupVideoMonitoring(video);
    });
    // Find all iframe elements
    const iframes = allElements.filter((el) => el.tagName === "IFRAME");
    iframes.forEach((iframe) => {
        handleIframeChange(iframe);
    });
    // Clean up references to removed videos
    const previousCount = allMediaElements.length;
    allMediaElements = allMediaElements.filter((video) => {
        return document.body.contains(video) || videos.includes(video);
    });
    // Only log if the count changed
    if (previousCount !== allMediaElements.length &&
        allMediaElements.length > 0) {
        debugLog("Video count changed", { count: allMediaElements.length });
    }
}
// Get all elements in shadow DOM
function getShadowElements(root) {
    let elements = [];
    // Get all elements in the current root
    const allElements = Array.from(root.querySelectorAll("*"));
    elements = elements.concat(allElements);
    // Check each element for shadow root
    allElements.forEach((element) => {
        if (element.shadowRoot) {
            // Add elements from this shadow root
            elements = elements.concat(getShadowElements(element.shadowRoot));
        }
    });
    return elements;
}
// Observe shadow DOM
function observeShadowRoot(shadowRoot) {
    // First check for existing videos and iframes
    const videos = shadowRoot.querySelectorAll("video");
    videos.forEach((video) => setupVideoMonitoring(video));
    const iframes = shadowRoot.querySelectorAll("iframe");
    iframes.forEach((iframe) => handleIframeChange(iframe));
    // Then observe for changes
    const shadowObserver = new MutationObserver((mutations) => {
        let shouldCheck = false;
        mutations.forEach((mutation) => {
            // Check for added nodes
            mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLVideoElement) {
                    setupVideoMonitoring(node);
                }
                else if (node instanceof HTMLIFrameElement) {
                    handleIframeChange(node);
                }
                else if (node instanceof Element) {
                    // Check if this element has a shadow root
                    if (node.shadowRoot) {
                        observeShadowRoot(node.shadowRoot);
                    }
                    shouldCheck = true;
                }
            });
            // Check for attribute changes
            if (mutation.type === "attributes") {
                if (mutation.target instanceof HTMLVideoElement &&
                    (mutation.attributeName === "src" ||
                        mutation.attributeName === "currentSrc")) {
                    handleVideoChange(mutation.target);
                }
                else if (mutation.target instanceof HTMLIFrameElement &&
                    mutation.attributeName === "src") {
                    handleIframeChange(mutation.target);
                }
            }
        });
        // If we added new elements, check everything
        if (shouldCheck) {
            monitorElements();
        }
    });
    // Observe all changes in the shadow DOM
    shadowObserver.observe(shadowRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "currentSrc"],
    });
}
// Monitor DOM changes
const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    mutations.forEach((mutation) => {
        // Check for added nodes
        mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLVideoElement) {
                setupVideoMonitoring(node);
            }
            else if (node instanceof HTMLIFrameElement) {
                handleIframeChange(node);
            }
            else if (node instanceof Element) {
                // Check if this element has a shadow root
                if (node.shadowRoot) {
                    observeShadowRoot(node.shadowRoot);
                }
                shouldCheck = true;
            }
        });
        // Check for attribute changes
        if (mutation.type === "attributes") {
            if (mutation.target instanceof HTMLVideoElement &&
                (mutation.attributeName === "src" ||
                    mutation.attributeName === "currentSrc")) {
                handleVideoChange(mutation.target);
            }
            else if (mutation.target instanceof HTMLIFrameElement &&
                mutation.attributeName === "src") {
                handleIframeChange(mutation.target);
            }
            else if (mutation.attributeName === "shadowroot") {
                // Check if a shadow root was attached
                const element = mutation.target;
                if (element.shadowRoot) {
                    observeShadowRoot(element.shadowRoot);
                }
            }
        }
    });
    // If we added new elements, check everything
    if (shouldCheck) {
        monitorElements();
    }
});
// Start monitoring
observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "currentSrc", "shadowroot"],
});
// Check for existing shadow roots
document.querySelectorAll("*").forEach((element) => {
    if (element.shadowRoot) {
        observeShadowRoot(element.shadowRoot);
    }
});
// Monitor URL changes using History API
function setupHistoryMonitoring() {
    // Monitor pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (state, unused, url) {
        originalPushState.call(this, state, unused, url);
        checkPageChanges();
    };
    history.replaceState = function (state, unused, url) {
        originalReplaceState.call(this, state, unused, url);
        checkPageChanges();
    };
    // Monitor popstate events (back/forward navigation)
    window.addEventListener("popstate", function () {
        checkPageChanges();
    });
    // Monitor hashchange events
    window.addEventListener("hashchange", function () {
        checkPageChanges();
    });
}
// Reset when page unloads
window.addEventListener("beforeunload", () => {
    changeCount = 0;
    knownIframes.clear();
    hasInitialPlayback = false;
    allMediaElements = [];
    if (forceScanInterval !== null) {
        clearInterval(forceScanInterval);
        forceScanInterval = null;
    }
});
// Set initial playback to true after a delay
setTimeout(() => {
    if (!hasInitialPlayback) {
        hasInitialPlayback = true;
        debugLog("Setting initial playback after delay");
    }
}, 5000); // 5 second delay
// Initial setup
setupHistoryMonitoring();
monitorElements();
setInterval(monitorElements, 1000);
setInterval(checkPageChanges, 1000); // Check for page changes periodically
