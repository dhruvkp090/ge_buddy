import React, { useState } from "react";
import WebsiteInput from "./WebsiteInput";
import WebsiteList from "./WebsiteList";
import { Website } from "../types/website";

interface WebsiteCategoryProps {
  title: string;
  websites: { url: string }[];
  onAdd: (url: string) => boolean;
  onRemove: (index: number) => void;
  error: string | null;
  theme?: "purple" | "teal" | "orange";
}

const WebsiteCategory: React.FC<WebsiteCategoryProps> = ({
  title,
  websites,
  onAdd,
  onRemove,
  error,
  theme = "purple",
}) => {
  const [newUrl, setNewUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAdd(newUrl)) {
      setNewUrl("");
    }
  };

  const getThemeClasses = () => {
    switch (theme) {
      case "teal":
        return {
          border: "border-teal-100",
          ring: "focus:ring-teal-500",
          button: "bg-teal-500 hover:bg-teal-600",
          icon: "text-teal-500",
          link: "text-teal-600 hover:text-teal-700",
        };
      case "orange":
        return {
          border: "border-orange-100",
          ring: "focus:ring-orange-500",
          button: "bg-orange-500 hover:bg-orange-600",
          icon: "text-orange-500",
          link: "text-orange-600 hover:text-orange-700",
        };
      default:
        return {
          border: "border-purple-100",
          ring: "focus:ring-purple-500",
          button: "bg-purple-500 hover:bg-purple-600",
          icon: "text-purple-500",
          link: "text-purple-600 hover:text-purple-700",
        };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-sm border ${themeClasses.border} hover:shadow-md transition-shadow`}
    >
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Enter website URL"
            className={`flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${themeClasses.ring} focus:border-transparent`}
          />
          <button
            type="submit"
            className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 ${themeClasses.button}`}
          >
            Add
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {websites.map((website, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
          >
            <a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 ${themeClasses.link} hover:underline break-all`}
            >
              {website.url}
            </a>
            <button
              onClick={() => onRemove(index)}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-3"
              aria-label="Remove website"
            >
              <svg
                className={`w-5 h-5 ${themeClasses.icon}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebsiteCategory;
