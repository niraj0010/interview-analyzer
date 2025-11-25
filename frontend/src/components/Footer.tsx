import React from "react";

const Footer: React.FC = () => {
  return (
    <footer
      className="
        w-full 
        bg-[#071722] 
        py-8 
        border-t 
        border-[#1e2a36] 
        flex 
        justify-center
      "
    >
      <div
        className="
          w-full 
          max-w-[1300px] 
          flex 
          flex-col 
          items-center 
          text-center 
          px-4
        "
      >
        <p className="text-gray-400 text-sm font-medium tracking-wide">
          © {new Date().getFullYear()} Interview Analyzer
        </p>

        <p className="text-xs text-teal-300 opacity-90 mt-2 tracking-wide">
          AI-Powered Insights • Created by{" "}
          <span className="font-semibold">Team Humanize</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
