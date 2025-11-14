"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
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
  const glowControls = useAnimation();

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

  // === Animate subtle search-style glow ===
  useEffect(() => {
    if (isOpen) {
      glowControls.start({
        opacity: [0.08, 0.18, 0.08],
        scale: [1, 1.04, 1],
        transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
      });
    } else {
      glowControls.stop();
    }
  }, [isOpen, glowControls]);

  const variants = {
    hidden: { opacity: 0, y: 6, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 4, scale: 0.98 },
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* === Avatar Button + Glow === */}
      <div className="relative">
        {mode === "floating" && (
          <motion.div
            aria-hidden
            animate={glowControls}
            initial={{ opacity: 0.1, scale: 1 }}
            className="absolute inset-0 rounded-full pointer-events-none -z-10 blur-[22px]"
            style={{
              background:
                "radial-gradient(300px 120px at 10% 20%, rgba(0,224,255,0.09), transparent 20%), radial-gradient(200px 90px at 90% 80%, rgba(168,85,247,0.08), transparent 24%)",
            }}
          />
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title={displayUserName || "Profile"}
          className={`relative flex items-center transition-all duration-200 focus:outline-none
            ${
              mode === "floating"
                ? "justify-center w-9 h-9 text-sm font-semibold rounded-full bg-gradient-to-b from-[#0A0B1A] to-[#141A2B] text-[#E6F1FF] border border-[#505D7A]/30 hover:border-[#6B7FA0]/40 shadow-[0_0_12px_rgba(0,224,255,0.08),0_0_8px_rgba(168,85,247,0.06)]"
                : "justify-start w-full px-3 py-2 rounded-md text-gray-300 hover:bg-[#11182A]/80 hover:text-[#E6F1FF]"
            }`}
        >
          {/* Avatar Circle */}
          <div
            className={`flex items-center justify-center rounded-full border border-[#505D7A40] bg-gradient-to-b from-[#0B0C1A] to-[#141A2B]
              ${mode === "floating" ? "w-8 h-8" : "w-9 h-9"}
            `}
          >
            {displayUserName ? (
              <span className="uppercase text-[13.5px] text-[#E6F1FF]">
                {displayUserName[0]}
              </span>
            ) : (
              <User size={17} className="text-[#E6F1FF]" />
            )}
          </div>

          {/* Username (sidebar only) */}
          {mode === "sidebar" && (
            <div className="ml-3 flex flex-col items-start">
              <span className="truncate text-[13.5px] text-[#E6F1FF] font-medium leading-none">
                {displayUserName || "User"}
              </span>
              <span className="text-[11.5px] text-[#8EA0C0] leading-tight mt-0.5">
                Profile
              </span>
            </div>
          )}
        </button>
      </div>

      {/* === Dropdown === */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="dropdown"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={variants}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`absolute bottom-full mb-3 left-0 z-50 rounded-xl overflow-hidden backdrop-blur-lg
              ${mode === "floating" ? "w-60" : "w-full"}
              bg-gradient-to-b from-[#0A0B1A]/95 to-[#0F172A]/92 border border-[#505D7A30]
              shadow-[0_8px_28px_rgba(0,224,255,0.10),0_4px_16px_rgba(168,85,247,0.08)]
            `}
          >
            {/* Header */}
            <div className="px-4 py-2.5 text-[13px] text-gray-300 border-b border-[#505D7A20] bg-[#0B0C1A]/40">
              <div className="font-semibold text-[#DDE9FF]">Daily Usage</div>
              <div className="flex justify-between items-center text-xs text-[#AAB7C4] mt-1">
                <span>Tokens Used:</span>
                <span className="font-bold text-[#00E0FF]">
                  {dailyTokenUsage} / {dailyTokenLimit}
                </span>
              </div>
            </div>

            {/* Settings */}
            <button
              onClick={onSettings}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-gray-300 hover:bg-[#11182A]/80 hover:text-[#E6F1FF] transition-colors duration-150"
            >
              <Settings size={18} className="text-[#00E0FF80]" />
              <span>Settings</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-gray-300 hover:bg-[#121726]/85 hover:text-[#E6F1FF] rounded-b-xl transition-colors duration-150"
            >
              <LogOut size={18} className="text-[#00E0FF70]" />
              <span>Sign Out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
