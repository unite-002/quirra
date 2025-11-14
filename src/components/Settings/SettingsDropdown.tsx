"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Tabs
import GeneralTab from "./SettingsContent/GeneralTab";
import NotificationTab from "./SettingsContent/NotificationTab";
import PersonalizationTab from "./SettingsContent/PersonalizationTab";
import AccessibilityTab from "./SettingsContent/AccessibilityTab";
import DataControlTab from "./SettingsContent/DataControlTab";
import SecurityTab from "./SettingsContent/SecurityTab";
import AccountTab from "./SettingsContent/AccountTab";
import AboutTab from "./SettingsContent/AboutTab";

// Sidebar
import SettingsSidebar from "./SettingsSidebar";

// Hook (real-time global settings)
import { useSettings } from "./useSettings";

export default function SettingsDropdown({
  onClose,
}: {
  onClose?: () => void;
}) {
  const [activeTab, setActiveTab] = useState("General");
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // ⛓️ connect global settings context
  const { settings, isLoaded, saveNow } = useSettings();

  // disable scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleBackdropPointerDown = (e: React.PointerEvent) => {
    if (e.target === backdropRef.current) {
      saveNow(); // flush unsaved changes before closing
      onClose?.();
    }
  };

  const tabs = [
    "General",
    "Notification",
    "Personalization",
    "Accessibility",
    "Data Control",
    "Security",
    "Account",
    "About",
  ];

  // render active tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case "General":
        return <GeneralTab />;
      case "Notification":
        return <NotificationTab />;
      case "Personalization":
        return <PersonalizationTab />;
      case "Accessibility":
        return <AccessibilityTab />;
      case "Data Control":
        return <DataControlTab />;
      case "Security":
        return <SecurityTab />;
      case "Account":
        return <AccountTab />;
      case "About":
        return <AboutTab />;
      default:
        return (
          <div className="text-sm text-gray-400">
            This tab’s content will be added soon.
          </div>
        );
    }
  };

  return (
    <div
      ref={backdropRef}
      onPointerDown={handleBackdropPointerDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,8,20,0.85)] backdrop-blur-md p-4"
    >
      <AnimatePresence>
        <motion.div
          key="settings"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onPointerDown={(e) => e.stopPropagation()}
          className="relative text-gray-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-[#1E293B] w-[760px] max-w-[95vw] h-[600px] max-h-[90vh] flex overflow-hidden bg-[#0B1125]"
        >
          {/* Sidebar */}
          <SettingsSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onClose={onClose}
            tabs={tabs}
          />

          {/* Main Content */}
          <main className="flex-1 bg-[#101830] p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1E293B] scrollbar-track-transparent relative">
            {/* Close (desktop) */}
            <button
              onClick={() => {
                saveNow(); // flush before closing
                onClose?.();
              }}
              className="hidden md:block absolute top-4 right-4 p-1.5 rounded-md hover:bg-[#16213A] transition-colors"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-white" />
            </button>

            <h2 className="text-lg font-semibold mb-5 text-white border-b border-[#1E293B] pb-2 flex items-center justify-between">
              <span>{activeTab}</span>
              {!isLoaded && (
                <span className="text-xs text-gray-400 animate-pulse">
                  Syncing...
                </span>
              )}
            </h2>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {isLoaded ? (
                  renderActiveTab()
                ) : (
                  <div className="text-gray-400 text-sm animate-pulse">
                    Loading your settings...
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
