import React from "react";

interface RedirectProps {
  website: string;
}

const FunAndWorkRedirect: React.FC<RedirectProps> = ({ website }) => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 flex flex-col items-center justify-center">
      <h1 className="text-8xl font-bold text-white mb-8 animate-pulse">
        FUN & WORK!
      </h1>
      <button
        onClick={() => {
          window.location.href = website;
        }}
        className="bg-white text-teal-600 px-8 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
      >
        Continue to Website
      </button>
    </div>
  );
};

export default FunAndWorkRedirect;
