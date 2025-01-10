import React, { useState, useEffect } from "react";
import { getDomain, formatUrl } from "../utils/urlUtils";
import { WebsiteCategories } from "../types/website";

const Popup: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [category, setCategory] = useState<"fun" | "funAndWork" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);

        // Check category
        const stored = await chrome.storage.local.get("websiteCategories");
        const categories = stored.websiteCategories || {
          fun: [],
          funAndWork: [],
        };
        const domain = getDomain(tabs[0].url);

        if (domain) {
          if (
            categories.fun.some(
              (site: { url: string }) => getDomain(site.url) === domain
            )
          ) {
            setCategory("fun");
          } else if (
            categories.funAndWork.some(
              (site: { url: string }) => getDomain(site.url) === domain
            )
          ) {
            setCategory("funAndWork");
          }
        }
      }
    });
  }, []);

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
    };

    // Check if URL already exists in any category
    const domain = getDomain(formattedUrl);
    if (domain) {
      if (
        categories.fun.some((site) => getDomain(site.url) === domain) ||
        categories.funAndWork.some((site) => getDomain(site.url) === domain)
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

  const openSettings = () => {
    // Open settings in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL("build/index.html#/settings"),
    });
    // Close the popup
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

      {category ? (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Category</h2>
          <div
            className={`px-4 py-2 rounded-lg ${
              category === "fun"
                ? "bg-purple-100 text-purple-700"
                : "bg-teal-100 text-teal-700"
            }`}
          >
            {category === "fun" ? "Fun Website" : "Fun & Work Website"}
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-2">
          <button
            onClick={() => addToCategory("fun")}
            className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors duration-200"
          >
            Add to Fun Websites
          </button>
          <button
            onClick={() => addToCategory("funAndWork")}
            className="w-full bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors duration-200"
          >
            Add to Fun & Work Websites
          </button>
        </div>
      )}

      <button
        onClick={openSettings}
        className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
      >
        Open Settings
      </button>
    </div>
  );
};

export default Popup;
