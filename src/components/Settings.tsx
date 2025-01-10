import React, { useState, useEffect } from "react";
import {
  WebsiteCategories,
  TimerSettings,
  CategorySettings,
} from "../types/website";
import { formatUrl, getDomain } from "../utils/urlUtils";
import WebsiteCategory from "./WebsiteCategory";

const Settings: React.FC = () => {
  const [categories, setCategories] = useState<WebsiteCategories>({
    fun: [],
    funAndWork: [],
    socialMedia: [],
  });

  const [settings, setSettings] = useState<CategorySettings>({
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
      waitTime: 10,
      accessDuration: 10,
    },
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load categories and settings
    chrome.storage.local.get(
      ["websiteCategories", "categorySettings"],
      (stored) => {
        if (stored.websiteCategories) {
          setCategories(stored.websiteCategories);
        }
        if (stored.categorySettings) {
          setSettings(stored.categorySettings);
        }
      }
    );
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ websiteCategories: categories });
  }, [categories]);

  useEffect(() => {
    chrome.storage.local.set({ categorySettings: settings });
  }, [settings]);

  const isUrlInAnyCategory = (url: string): boolean => {
    const domain = getDomain(url);
    if (!domain) return false;

    return (
      categories.fun.some((site) => getDomain(site.url) === domain) ||
      categories.funAndWork.some((site) => getDomain(site.url) === domain) ||
      categories.socialMedia.some((site) => getDomain(site.url) === domain)
    );
  };

  const addWebsite = (category: keyof WebsiteCategories, url: string) => {
    const formattedUrl = formatUrl(url);

    if (!formattedUrl) {
      return false;
    }

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

  const handleSettingChange = (
    category: keyof WebsiteCategories,
    purpose: "fun" | "work" | "social",
    setting: keyof TimerSettings,
    value: number
  ) => {
    if (value < 0) return;
    if (setting === "waitTime" && value === 0) return;

    setSettings((prev) => {
      if (category === "fun") {
        return {
          ...prev,
          fun: {
            ...prev.fun,
            [setting]: value,
          },
        };
      } else if (category === "funAndWork") {
        return {
          ...prev,
          funAndWork: {
            ...prev.funAndWork,
            [purpose]: {
              ...prev.funAndWork[purpose as "fun" | "work"],
              [setting]: value,
            },
          },
        };
      } else {
        return {
          ...prev,
          socialMedia: {
            ...prev.socialMedia,
            [setting]: value,
          },
        };
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Focus Settings
          </h1>
          <p className="text-lg text-gray-600">
            Customize your website categories and timer settings to maintain
            focus
          </p>
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm">
              {error}
            </div>
          )}
        </header>

        {/* Website Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Website Categories
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <WebsiteCategory
              title="Fun Websites"
              websites={categories.fun}
              onAdd={(url) => addWebsite("fun", url)}
              onRemove={(index) => removeWebsite("fun", index)}
              error={error}
              theme="purple"
            />

            <WebsiteCategory
              title="Fun & Work Websites"
              websites={categories.funAndWork}
              onAdd={(url) => addWebsite("funAndWork", url)}
              onRemove={(index) => removeWebsite("funAndWork", index)}
              error={error}
              theme="teal"
            />

            <WebsiteCategory
              title="Social Media"
              websites={categories.socialMedia}
              onAdd={(url) => addWebsite("socialMedia", url)}
              onRemove={(index) => removeWebsite("socialMedia", index)}
              error={error}
              theme="orange"
            />
          </div>
        </div>

        {/* Timer Settings */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Timer Settings
          </h2>
          <div className="space-y-8">
            {/* Fun Websites Settings */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Fun Websites
                  </h2>
                  <p className="text-gray-600">
                    Settings for purely entertainment websites
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xl">🎮</span>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <label className="text-gray-700 min-w-[200px] font-medium">
                    Wait time before access:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={settings.fun.waitTime}
                      onChange={(e) =>
                        handleSettingChange(
                          "fun",
                          "fun",
                          "waitTime",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <span className="text-gray-600">seconds</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="text-gray-700 min-w-[200px] font-medium">
                    Access duration:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={settings.fun.accessDuration}
                      onChange={(e) =>
                        handleSettingChange(
                          "fun",
                          "fun",
                          "accessDuration",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <span className="text-gray-600">minutes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fun & Work Websites Settings */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-teal-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Fun & Work Websites
                  </h2>
                  <p className="text-gray-600">
                    Settings for websites that can be used for both work and
                    entertainment
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-teal-400 to-teal-600 flex items-center justify-center">
                  <span className="text-white text-xl">💼</span>
                </div>
              </div>

              {/* Fun Purpose Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  When used for fun:
                </h3>
                <div className="space-y-6 ml-6">
                  <div className="flex items-center gap-6">
                    <label className="text-gray-700 min-w-[200px] font-medium">
                      Wait time before access:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={settings.funAndWork.fun.waitTime}
                        onChange={(e) =>
                          handleSettingChange(
                            "funAndWork",
                            "fun",
                            "waitTime",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">seconds</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="text-gray-700 min-w-[200px] font-medium">
                      Access duration:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={settings.funAndWork.fun.accessDuration}
                        onChange={(e) =>
                          handleSettingChange(
                            "funAndWork",
                            "fun",
                            "accessDuration",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">minutes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Purpose Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  When used for work:
                </h3>
                <div className="space-y-6 ml-6">
                  <div className="flex items-center gap-6">
                    <label className="text-gray-700 min-w-[200px] font-medium">
                      Wait time before access:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={settings.funAndWork.work.waitTime}
                        onChange={(e) =>
                          handleSettingChange(
                            "funAndWork",
                            "work",
                            "waitTime",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">seconds</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="text-gray-700 min-w-[200px] font-medium">
                      Access duration:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={settings.funAndWork.work.accessDuration}
                        onChange={(e) =>
                          handleSettingChange(
                            "funAndWork",
                            "work",
                            "accessDuration",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">minutes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media Settings */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Social Media
                  </h2>
                  <p className="text-gray-600">
                    Strict limits for social media to help maintain focus
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
                  <span className="text-white text-xl">📱</span>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <label className="text-gray-700 min-w-[200px] font-medium">
                    Wait time before access:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={settings.socialMedia.waitTime}
                      onChange={(e) =>
                        handleSettingChange(
                          "socialMedia",
                          "social",
                          "waitTime",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <span className="text-gray-600">seconds</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="text-gray-700 min-w-[200px] font-medium">
                    Access duration:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={settings.socialMedia.accessDuration}
                      onChange={(e) =>
                        handleSettingChange(
                          "socialMedia",
                          "social",
                          "accessDuration",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <span className="text-gray-600">minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
