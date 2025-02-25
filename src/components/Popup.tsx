import React, { useState, useEffect } from "react";
import { getDomain, formatUrl } from "../utils/urlUtils";
import { WebsiteCategories, LimitType } from "../types/website";

const Popup: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [category, setCategory] = useState<
    "fun" | "funAndWork" | "socialMedia" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [purpose, setPurpose] = useState<string | null>(null);
  const [blockTimeLeft, setBlockTimeLeft] = useState<number | null>(null);
  const [limitType, setLimitType] = useState<LimitType | null>(null);
  const [videoCount, setVideoCount] = useState<number | null>(null);
  const [maxVideoChanges, setMaxVideoChanges] = useState<number | null>(null);

  useEffect(() => {
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);

        // Check category
        const stored = await chrome.storage.local.get([
          "websiteCategories",
          "categorySettings",
        ]);
        const categories = stored.websiteCategories || {
          fun: [],
          funAndWork: [],
          socialMedia: [],
        };
        const settings = stored.categorySettings;
        const urlDomain = getDomain(tabs[0].url);

        if (urlDomain) {
          if (
            categories.fun.some(
              (site: { url: string }) => getDomain(site.url) === urlDomain
            )
          ) {
            setCategory("fun");
            if (settings?.fun) {
              setMaxVideoChanges(settings.fun.maxVideoChanges);
            }
          } else if (
            categories.funAndWork.some(
              (site: { url: string }) => getDomain(site.url) === urlDomain
            )
          ) {
            setCategory("funAndWork");
            // Max video changes will be set when we get the purpose
          } else if (
            categories.socialMedia.some(
              (site: { url: string }) => getDomain(site.url) === urlDomain
            )
          ) {
            setCategory("socialMedia");
            if (settings?.socialMedia) {
              setMaxVideoChanges(settings.socialMedia.maxVideoChanges);
            }
          }

          // Check if site is temporarily allowed and get expiry time
          const hostname = new URL(tabs[0].url).hostname;
          chrome.runtime.sendMessage(
            { type: "CHECK_ALLOWANCE", domain: hostname },
            (response) => {
              if (response) {
                if (response.allowed) {
                  setLimitType(response.limitType);
                  setPurpose(response.purpose);

                  if (response.limitType === "time") {
                    const timeLeftMs = response.expiry - Date.now();
                    setTimeLeft(Math.max(0, Math.floor(timeLeftMs / 1000)));
                  } else if (response.limitType === "video") {
                    setVideoCount(response.videoCount || 0);
                    // Set max video changes based on purpose for funAndWork sites
                    if (category === "funAndWork" && settings?.funAndWork) {
                      setMaxVideoChanges(
                        response.purpose === "work"
                          ? settings.funAndWork.work.maxVideoChanges
                          : settings.funAndWork.fun.maxVideoChanges
                      );
                    }
                  }
                } else if (response.nextAllowedTime) {
                  const blockTimeLeftMs = response.nextAllowedTime - Date.now();
                  setBlockTimeLeft(
                    Math.max(0, Math.floor(blockTimeLeftMs / 1000))
                  );
                }
              }
            }
          );
        }
      }
    });
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (timeLeft === null && blockTimeLeft === null) return;

    const timer = setInterval(() => {
      if (timeLeft !== null) {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }
      if (blockTimeLeft !== null) {
        setBlockTimeLeft((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, blockTimeLeft]);

  const addToCategory = async (categoryType: keyof WebsiteCategories) => {
    const formattedUrl = formatUrl(currentUrl);
    if (!formattedUrl) {
      setError("Invalid URL format");
      return;
    }

    const stored = await chrome.storage.local.get("websiteCategories");
    const categories: WebsiteCategories = stored.websiteCategories || {
      fun: [],
      funAndWork: [],
      socialMedia: [],
    };

    // Check if URL already exists in any category
    const domain = getDomain(formattedUrl);
    if (domain) {
      if (
        categories.fun.some((site) => getDomain(site.url) === domain) ||
        categories.funAndWork.some((site) => getDomain(site.url) === domain) ||
        categories.socialMedia.some((site) => getDomain(site.url) === domain)
      ) {
        setError("This website is already in one of your lists");
        return;
      }
    }

    // Add to selected category
    const updatedCategories = {
      ...categories,
      [categoryType]: [...categories[categoryType], { url: formattedUrl }],
    };

    // Save to storage
    await chrome.storage.local.set({ websiteCategories: updatedCategories });
    setCategory(categoryType);
    setError(null);
  };

  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const openSettings = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("build/index.html#/settings"),
    });
    window.close();
  };

  return (
    <div className="w-96 p-6 bg-white">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Current Website
        </h1>
        <p className="text-gray-600 break-all">{currentUrl}</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {category && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Website Category
          </h2>
          <div
            className={`px-4 py-2 rounded-lg ${
              category === "fun"
                ? "bg-purple-100 text-purple-700"
                : category === "funAndWork"
                ? "bg-teal-100 text-teal-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            <div>
              {category === "fun"
                ? "Fun Website"
                : category === "funAndWork"
                ? "Fun & Work Website"
                : "Social Media Website"}
            </div>
            {limitType && (
              <div className="text-sm mt-1 opacity-75">
                {limitType === "time"
                  ? "Time Limit Active"
                  : "Video Changes Limit Active"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* {category && limitType === "time" && timeLeft !== null && timeLeft > 0 ? (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Time Remaining
          </h2>
          <div
            className={`px-4 py-3 rounded-lg ${
              category === "fun"
                ? "bg-purple-100 text-purple-700"
                : category === "funAndWork"
                ? "bg-teal-100 text-teal-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            <div className="text-3xl font-bold mb-1">
              {formatTimeLeft(timeLeft)}
            </div>
            <div className="text-sm opacity-75">
              Using for {purpose || "unknown purpose"}
            </div>
          </div>
        </div>
      ) : category && limitType === "video" && videoCount !== null ? (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Video Changes
          </h2>
          <div
            className={`px-4 py-3 rounded-lg ${
              category === "fun"
                ? "bg-purple-100 text-purple-700"
                : category === "funAndWork"
                ? "bg-teal-100 text-teal-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            <div className="text-3xl font-bold mb-1">
              {videoCount} / {maxVideoChanges}
            </div>
            <div className="text-sm opacity-75">
              Video changes used{purpose ? ` (${purpose})` : ""}
            </div>
          </div>
        </div>
      ) : category && blockTimeLeft !== null && blockTimeLeft > 0 ? (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Time Until Access
          </h2>
          <div className="px-4 py-3 rounded-lg bg-gray-100 text-gray-700">
            <div className="text-3xl font-bold mb-1">
              {formatTimeLeft(blockTimeLeft)}
            </div>
            <div className="text-sm opacity-75">
              Until you can access this website again
            </div>
          </div>
        </div>
      ) : category ? (
        <div className="mb-6 p-3 bg-gray-100 text-gray-600 rounded-lg">
          No active limits for this website
        </div>
      ) : null} */}

      {!category && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Add to Category
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => addToCategory("fun")}
              className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
            >
              Fun
            </button>
            <button
              onClick={() => addToCategory("funAndWork")}
              className="px-4 py-2 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors"
            >
              Fun & Work
            </button>
            <button
              onClick={() => addToCategory("socialMedia")}
              className="px-4 py-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
            >
              Social Media
            </button>
          </div>
        </div>
      )}

      <button
        onClick={openSettings}
        className="w-full mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
      >
        Open Settings
      </button>
    </div>
  );
};

export default Popup;
