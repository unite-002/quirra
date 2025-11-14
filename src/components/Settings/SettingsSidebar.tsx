"use client";

import { X } from "lucide-react";

interface SidebarProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose?: () => void;
}

export default function SettingsSidebar({
  tabs,
  activeTab,
  setActiveTab,
  onClose,
}: SidebarProps) {
  return (
    <aside className="w-[220px] flex-shrink-0 bg-[#0A0F24] border-r border-[#1E293B] p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-md hover:bg-[#16213A] transition-colors"
        >
          <X className="h-4 w-4 text-gray-400 hover:text-white" />
        </button>
      </div>

      {/* Tabs List */}
      <nav className="flex flex-col gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1E293B] scrollbar-track-transparent">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-[#1D2A44] text-white border-l-2 border-[#2563EB]"
                : "text-slate-300 hover:text-white hover:bg-[#16213A]"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </aside>
  );
}
