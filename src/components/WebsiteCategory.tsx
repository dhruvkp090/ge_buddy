import React from "react";
import WebsiteInput from "./WebsiteInput";
import WebsiteList from "./WebsiteList";
import { Website } from "../types/website";

interface WebsiteCategoryProps {
  title: string;
  websites: Website[];
  onAdd: (url: string) => boolean;
  onRemove: (index: number) => void;
  error?: string | null;
}

const WebsiteCategory: React.FC<WebsiteCategoryProps> = ({
  title,
  websites,
  onAdd,
  onRemove,
  error,
}) => {
  return (
    <div className="bg-gray-50 p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
      <div className="mb-6">
        <WebsiteInput onAdd={onAdd} placeholder={`Add ${title} website`} />
      </div>
      <WebsiteList websites={websites} onRemove={onRemove} />
    </div>
  );
};

export default WebsiteCategory;
