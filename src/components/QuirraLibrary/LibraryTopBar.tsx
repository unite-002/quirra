"use client";

import { Search, UploadCloud } from "lucide-react";

type Props = {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
};

export default function LibraryTopBar({
  searchQuery,
  onSearchChange,
  uploading,
  onUpload,
}: Props) {
  return (
    <div className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0E121D]/70 backdrop-blur-lg">
      {/* === Title Section (moved slightly to the right) === */}
      <div className="ml-10">
        <h1 className="text-xl font-semibold text-[#E6F1FF] tracking-wide">
          🧠 Quirra Library
        </h1>
        <p className="text-xs text-[#A0B3C2] mt-0.5">
          Your evolving knowledge space
        </p>
      </div>

      {/* === Right Controls === */}
      <div className="flex items-center gap-3">
        {/* Search input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0B3C2]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Library..."
            className="pl-8 pr-3 py-1.5 rounded-lg bg-[#141826] border border-white/10 text-sm text-[#E6F1FF] placeholder-[#7A8699] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/60 w-52 transition-all"
          />
        </div>

        {/* Upload */}
        <label className="relative cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#00E5FF]/20 to-[#A855F7]/20 text-[#E6F1FF] px-3 py-1.5 rounded-lg text-sm hover:from-[#00E5FF]/30 hover:to-[#A855F7]/30 transition-all border border-white/10">
          <UploadCloud size={16} />
          <span>{uploading ? "Uploading…" : "Upload"}</span>
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
