"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const tabs = [
  "General",
  "Notification",
  "Personalization",
  "Apps & Connects",
  "Data Control",
  "Security",
  "Account",
];

// Example content components for each tab
const TabContent: Record<string, React.ReactNode> = {
  General: (
    <div>
      <p>Here you can adjust general settings.</p>
      <p>Add toggles, preferences, and other general options here.</p>
    </div>
  ),
  Notification: (
    <div>
      <p>Manage your notifications here.</p>
      <p>Push notifications, email alerts, and other notification options.</p>
    </div>
  ),
  Personalization: (
    <div>
      <p>Customize your experience.</p>
      <p>Theme, layout, and personalization settings go here.</p>
    </div>
  ),
  "Apps & Connects": (
    <div>
      <p>Manage connected apps and integrations.</p>
      <p>Here you can authorize or remove third-party apps.</p>
    </div>
  ),
  "Data Control": (
    <div>
      <p>Control your data privacy.</p>
      <p>Options for export, deletion, and permissions.</p>
    </div>
  ),
  Security: (
    <div>
      <p>Security settings for your account.</p>
      <p>Change passwords, enable 2FA, and manage sessions.</p>
    </div>
  ),
  Account: (
    <div>
      <p>Account details and preferences.</p>
      <p>Manage email, username, and subscription settings.</p>
    </div>
  ),
};

export default function SettingsDropdown({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState("General");
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // disable scroll when open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose?.();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        key="settings-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col md:flex-row w-full max-w-[720px] h-[520px]
                   rounded-2xl overflow-hidden
                   bg-gradient-to-b from-[#0A0B1A] to-[#0F172A]
                   border border-white/10
                   shadow-[0_0_35px_rgba(0,212,255,0.08)]
                   text-gray-200 backdrop-blur-md"
      >
        {/* === Sidebar Tabs === */}
        <aside className="md:w-52 flex-shrink-0 border-b md:border-b-0 md:border-r border-white/10 p-5
                         bg-[linear-gradient(180deg,rgba(0,212,255,0.05)_0%,rgba(142,45,226,0.05)_100%)]
                         flex flex-col"
        >
          <div className="flex items-center justify-between md:justify-start md:mb-5">
            <h1 className="text-lg font-semibold text-white tracking-wide">Settings</h1>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-white" />
            </button>
          </div>

          <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar flex-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left
                  ${
                    activeTab === tab
                      ? "bg-[#111a2f] text-white shadow-[0_0_8px_rgba(0,212,255,0.15)]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        {/* === Main Content Area (Scrollable) === */}
        <main className="flex-1 relative p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <button
            onClick={onClose}
            className="hidden md:block absolute top-4 right-4 p-1.5 rounded-md hover:bg-white/10"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-white" />
          </button>

          <h2 className="text-lg font-semibold mb-4 text-white border-b border-white/10 pb-2">
            {activeTab}
          </h2>

          <div className="text-gray-400 text-sm mt-4">
            {TabContent[activeTab]}
          </div>
        </main>
      </motion.div>
    </div>
  );
}
