import React from "react";
import { Website } from "../types/website";

interface WebsiteListProps {
  websites: Website[];
  onRemove: (index: number) => void;
}

const WebsiteList: React.FC<WebsiteListProps> = ({ websites, onRemove }) => {
  return (
    <ul className="space-y-2">
      {websites.map((site, index) => (
        <li
          key={index}
          className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-blue-600 hover:text-blue-800 truncate"
          >
            {site.url}
          </a>
          <button
            onClick={() => onRemove(index)}
            className="text-red-500 hover:text-red-700 transition-colors duration-200 px-3 py-1 rounded-md hover:bg-red-50"
          >
            <i className="fas fa-trash-alt mr-1"></i>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
};

export default WebsiteList;
