import React, { useState, useEffect } from "react";
import WebsiteCategory from "./WebsiteCategory";
import { WebsiteCategories } from "../types/website";
import { formatUrl, getDomain } from "../utils/urlUtils";

const Settings: React.FC = () => {
  const [categories, setCategories] = useState<WebsiteCategories>({
    fun: [],
    funAndWork: [],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load categories
    chrome.storage.local.get("websiteCategories").then((stored) => {
      if (stored.websiteCategories) {
        setCategories(stored.websiteCategories);
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ websiteCategories: categories });
  }, [categories]);

  const isUrlInAnyCategory = (url: string): boolean => {
    const domain = getDomain(url);
    if (!domain) return false;

    return (
      categories.fun.some((site) => getDomain(site.url) === domain) ||
      categories.funAndWork.some((site) => getDomain(site.url) === domain)
    );
  };

  const addWebsite = (category: keyof WebsiteCategories, url: string) => {
    const formattedUrl = formatUrl(url);

    if (!formattedUrl) {
      return false; // URL formatting failed
    }

    // Check if domain exists in any category
    if (isUrlInAnyCategory(formattedUrl)) {
      setError("This website is already in one of your lists");
      return false;
    }

    setCategories((prev) => ({
      ...prev,
      [category]: [...prev[category], { url: formattedUrl }],
    }));
    setError(null);
    return true;
  };

  const removeWebsite = (category: keyof WebsiteCategories, index: number) => {
    setCategories((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Website Categories
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your website categories for different modes
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <WebsiteCategory
            title="Fun Websites"
            websites={categories.fun}
            onAdd={(url) => addWebsite("fun", url)}
            onRemove={(index) => removeWebsite("fun", index)}
            error={error}
          />

          <WebsiteCategory
            title="Fun & Work Websites"
            websites={categories.funAndWork}
            onAdd={(url) => addWebsite("funAndWork", url)}
            onRemove={(index) => removeWebsite("funAndWork", index)}
            error={error}
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;
