import React from "react";

interface RedirectProps {
  website: string;
}

const FunRedirect: React.FC<RedirectProps> = ({ website }) => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 flex flex-col items-center justify-center">
      <h1 className="text-8xl font-bold text-white mb-8 animate-bounce">
        FUN!
      </h1>
      <button
        onClick={() => {
          window.location.href = website;
        }}
        className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
      >
        Continue to Website
      </button>
    </div>
  );
};

export default FunRedirect;
