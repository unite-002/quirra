"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut, User } from "lucide-react";

type Mode = "floating" | "sidebar";

export type ProfileDropdownProps = {
  displayUserName?: string | null;
  dailyTokenUsage?: number;
  dailyTokenLimit?: number;
  isOpen: boolean;
  onToggle: () => void;
  onSettings: () => void;
  onSignOut: () => void;
  mode?: Mode;
  className?: string;
};

export default function ProfileDropdown({
  displayUserName,
  dailyTokenUsage = 0,
  dailyTokenLimit = 2000,
  isOpen,
  onToggle,
  onSettings,
  onSignOut,
  mode = "floating",
  className = "",
}: ProfileDropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // === Close on click outside or Escape ===
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggle();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onToggle]);

  // === Dropdown open/close animation ===
  const variants = {
    hidden: { opacity: 0, y: 6, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 4, scale: 0.98 },
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Avatar Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={displayUserName || "Profile"}
        className={`flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none
          ${mode === "floating"
            ? "w-9 h-9 text-sm font-bold bg-gradient-to-b from-[#1A2038] to-[#0B0C1A] text-white"
            : "w-full px-3 py-2 text-left rounded-md text-gray-300 hover:bg-[#1B2238] hover:text-white"
          }`}
      >
        {displayUserName ? (
          <span className="uppercase">{displayUserName[0]}</span>
        ) : (
          <User size={17} />
        )}
        {mode === "sidebar" && (
          <span className="ml-3 truncate text-[13.5px]">
            {displayUserName || "User"}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="dropdown"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={variants}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute bottom-full mb-3 left-0 z-50 rounded-xl overflow-hidden backdrop-blur-md
              ${mode === "floating" ? "w-60" : "w-full"}
              bg-gradient-to-br from-[#0A0B1A]/98 to-[#141A2B]/95 border border-[#00E0FF30]
              shadow-[0_0_25px_rgba(0,224,255,0.08)]
            `}
          >
            {/* Header */}
            <div className="px-4 py-2.5 text-[13px] text-gray-300 border-b border-[#00E0FF15] bg-[#0B0C1A]/60">
              <div className="font-semibold text-[#E6F1FF]">Daily Usage</div>
              <div className="flex justify-between items-center text-xs text-[#AAB7C4] mt-1">
                <span>Tokens Used:</span>
                <span className="font-bold text-[#00E0FF]">
                  {dailyTokenUsage} / {dailyTokenLimit}
                </span>
              </div>
            </div>

            {/* Settings */}
            <button
              onClick={() => {
                onSettings();
              }}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-gray-300 hover:bg-[#11182A]/90 hover:text-white transition-colors duration-150"
            >
              <Settings size={19} className="text-[#00E0FF90]" />
              <span>Settings</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={() => {
                onSignOut();
              }}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-red-400 hover:bg-red-700/30 hover:text-white rounded-b-xl transition-colors duration-150"
            >
              <LogOut size={19} />
              <span>Sign Out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
