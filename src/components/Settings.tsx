import React, { useState, useEffect } from "react";
import {
  WebsiteCategories,
  TimerSettings,
  CategorySettings,
  LimitType,
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
      maxVideoChanges: 3,
      defaultLimitType: "time",
    },
    funAndWork: {
      fun: {
        waitTime: 5,
        accessDuration: 5,
        maxVideoChanges: 3,
        defaultLimitType: "time",
      },
      work: {
        waitTime: 2,
        accessDuration: 30,
        maxVideoChanges: 10,
        defaultLimitType: "time",
      },
    },
    socialMedia: {
      waitTime: 15,
      accessDuration: 5,
      maxVideoChanges: 3,
      defaultLimitType: "time",
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
    category: string,
    setting: string,
    value: number | string
  ) => {
    setSettings((prevSettings) => {
      const newSettings = { ...prevSettings };
      if (category === "funAndWork") {
        const [subCategory, settingKey] = setting.split(".");
        if (typeof value === "string" && settingKey === "defaultLimitType") {
          (newSettings.funAndWork as any)[subCategory][settingKey] = value;
        } else if (typeof value === "number") {
          (newSettings.funAndWork as any)[subCategory][settingKey] = value;
        }
      } else {
        if (typeof value === "string" && setting === "defaultLimitType") {
          (newSettings[category as keyof CategorySettings] as any)[setting] =
            value;
        } else if (typeof value === "number") {
          (newSettings[category as keyof CategorySettings] as any)[setting] =
            value;
        }
      }
      return newSettings;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Focus Settings
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Customize your website categories and timer settings to maintain
            focus
          </p>
          <p className="text-md text-gray-500 italic">
            Add websites to categories below and configure how you want to limit
            your access to them
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Timer Settings
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Configure how you want to limit access to each category of websites
          </p>

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
                <div className="p-4 bg-purple-50 rounded-lg mb-4">
                  <h3 className="font-medium text-purple-800 mb-2">
                    Wait Time
                  </h3>
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
                            "waitTime",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">seconds</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-[200px]">
                    How long you must wait before accessing the website
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg mb-4">
                  <h3 className="font-medium text-purple-800 mb-2">
                    Time Limit Settings
                  </h3>
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
                            "accessDuration",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">minutes</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-[200px]">
                    How long you can access the website before being blocked
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg mb-4">
                  <h3 className="font-medium text-purple-800 mb-2">
                    Video Limit Settings
                  </h3>
                  <div className="flex items-center gap-6">
                    <label className="text-gray-700 min-w-[200px] font-medium">
                      Max Video Changes:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={settings.fun.maxVideoChanges}
                        onChange={(e) =>
                          handleSettingChange(
                            "fun",
                            "maxVideoChanges",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">videos</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-[200px]">
                    How many videos you can watch before being blocked
                  </p>
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
              <div className="mb-8 p-4 bg-teal-50 rounded-lg">
                <h3 className="text-lg font-semibold text-teal-800 mb-4">
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
                            "fun.waitTime",
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
                            "fun.accessDuration",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">minutes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="text-gray-700 min-w-[200px] font-medium">
                      Max Video Changes:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={settings.funAndWork.fun.maxVideoChanges}
                        onChange={(e) =>
                          handleSettingChange(
                            "funAndWork",
                            "fun.maxVideoChanges",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">videos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Purpose Settings */}
              <div className="p-4 bg-teal-50 rounded-lg">
                <h3 className="text-lg font-semibold text-teal-800 mb-4">
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
                            "work.waitTime",
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
                            "work.accessDuration",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">minutes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="text-gray-700 min-w-[200px] font-medium">
                      Max Video Changes:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={settings.funAndWork.work.maxVideoChanges}
                        onChange={(e) =>
                          handleSettingChange(
                            "funAndWork",
                            "work.maxVideoChanges",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">videos</span>
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
                <div className="p-4 bg-orange-50 rounded-lg mb-4">
                  <h3 className="font-medium text-orange-800 mb-2">
                    Wait Time
                  </h3>
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
                            "waitTime",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">seconds</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-[200px]">
                    How long you must wait before accessing the website
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg mb-4">
                  <h3 className="font-medium text-orange-800 mb-2">
                    Time Limit Settings
                  </h3>
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
                            "accessDuration",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">minutes</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-[200px]">
                    How long you can access the website before being blocked
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg mb-4">
                  <h3 className="font-medium text-orange-800 mb-2">
                    Video Limit Settings
                  </h3>
                  <div className="flex items-center gap-6">
                    <label className="text-gray-700 min-w-[200px] font-medium">
                      Max Video Changes:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={settings.socialMedia.maxVideoChanges}
                        onChange={(e) =>
                          handleSettingChange(
                            "socialMedia",
                            "maxVideoChanges",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">videos</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-[200px]">
                    How many videos you can watch before being blocked
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-xl font-bold text-blue-800 mb-3">
              How the Settings Work
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-blue-700">
                  Website Categories
                </h4>
                <p className="text-gray-700">
                  Group your websites into categories based on how you use them
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-700">Limit Types</h4>
                <ul className="list-disc ml-6 text-gray-700">
                  <li>
                    <strong>Time Limit:</strong> Restricts how long you can use
                    a website before being blocked
                  </li>
                  <li>
                    <strong>Video Changes:</strong> Restricts how many videos
                    you can watch before being blocked
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-700">Wait Time</h4>
                <p className="text-gray-700">
                  The delay before you can access a website - helps you pause
                  and consider if you really need to visit it
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
