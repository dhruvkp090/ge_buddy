import React, { useState } from "react";
import { isValidUrl, verifyWebsite } from "../utils/urlUtils";

interface WebsiteInputProps {
  onAdd: (url: string) => boolean;
  placeholder?: string;
}

const WebsiteInput: React.FC<WebsiteInputProps> = ({ onAdd, placeholder }) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    try {
      const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
      const isValid = await verifyWebsite(formattedUrl);

      if (!isValid) {
        setError("Website is not accessible");
        return;
      }

      const success = onAdd(url);
      if (success) {
        setUrl("");
      }
    } catch (error) {
      setError("Failed to verify website");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          placeholder={placeholder || "Enter website URL"}
          className={`flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none ${
            error ? "border-red-500" : ""
          }`}
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`px-6 py-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-300 focus:outline-none ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Verifying...
            </span>
          ) : (
            "Add"
          )}
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default WebsiteInput;
