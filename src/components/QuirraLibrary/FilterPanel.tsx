"use client";

import React from "react";

type Props = {
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
};

const FILTERS = [
  { label: "All", value: null },
  { label: "Notes", value: "note" },
  { label: "Files", value: "file" },
  { label: "Projects", value: "project" },
  { label: "Images", value: "image" },
];

export default function FilterPanel({ activeFilter, onFilterChange }: Props) {
  return (
    <div
      className="flex items-center justify-center gap-8 px-6 py-4 select-none backdrop-blur-3xl"
      style={{
        background: "transparent",
        color: "#C9D3E1",
        WebkitBackdropFilter: "blur(32px)", // ensures smooth glass blur on Safari too
      }}
    >
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.value;

        return (
          <button
            key={f.label}
            onClick={() => onFilterChange(f.value)}
            className={`relative transition-all duration-300 text-sm font-medium px-6 py-2.5 rounded-xl tracking-wide
              ${
                isActive
                  ? "text-[#E4E9F7] bg-[rgba(0,212,255,0.08)] shadow-[0_0_16px_rgba(0,212,255,0.06)]"
                  : "text-[#A0AEC0] hover:text-[#E2E8F0] hover:bg-[rgba(0,212,255,0.04)] hover:shadow-[0_0_8px_rgba(0,212,255,0.04)]"
              }`}
          >
            {f.label}
            {isActive && (
              <div
                className="absolute bottom-0 left-0 w-full h-[2px] rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,212,255,0.9), rgba(142,45,226,0.9))",
                  filter: "blur(3px)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
