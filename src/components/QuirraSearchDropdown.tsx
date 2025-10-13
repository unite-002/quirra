"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Search, XCircle, Loader2 } from "lucide-react";

type SearchResult = {
  id: string;
  title?: string;
  snippet?: string;
  kind?: string;
};

type Props = {
  isOpen: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  selectedResult: number;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onResultClick: (result: SearchResult) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  context?: "chats" | "docs";
  onContextChange?: (ctx: "chats" | "docs") => void;
};

export default function QuirraSearchDropdown({
  isOpen,
  searchQuery,
  searchResults,
  searchLoading,
  selectedResult,
  onClose,
  onQueryChange,
  onResultClick,
  onScroll,
  context = "chats",
  onContextChange,
}: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opening
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Close with ESC key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[200] bg-black/50 flex items-start justify-center pt-24 px-4"
    >
      <motion.div
        ref={containerRef}
        initial={{ scale: 0.97, y: -8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.97, y: -8, opacity: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        style={{
          background: "linear-gradient(180deg, rgba(13,14,28,0.92) 0%, rgba(21,23,42,0.92) 100%)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: "0 8px 32px rgba(0, 224, 255, 0.12), 0 4px 18px rgba(168, 85, 247, 0.08)",
          border: "1px solid rgba(80,100,140,0.10)",
        }}
        className="relative w-full max-w-[460px] rounded-[22px] overflow-hidden"
      >
        {/* === Ambient Glow === */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[22px] -z-10"
          style={{
            boxShadow: "0 8px 30px rgba(0,224,255,0.10)",
            background:
              "radial-gradient(300px 120px at 10% 20%, rgba(0,224,255,0.06), transparent 18%), radial-gradient(200px 90px at 90% 80%, rgba(168,85,247,0.05), transparent 22%)",
          }}
        />

        {/* === Top Bar === */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/70">
          <Search size={20} className="text-[#8CA0B3]" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search your chats..."
            className="flex-1 bg-transparent text-[#E6F1FF] placeholder-[#99A3B3] outline-none text-[15px] font-medium tracking-wide"
            autoFocus
          />
          <button
            onClick={() => {
              if (searchQuery) onQueryChange("");
              else onClose();
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* === Context Tabs === */}
        <div className="flex gap-2 px-4 py-3 border-b border-gray-800/70">
          <button
            onClick={() => onContextChange?.("chats")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              context === "chats"
                ? "bg-gradient-to-r from-[#00E0FF]/60 to-[#A855F7]/60 text-white shadow-inner"
                : "text-gray-300 hover:bg-gray-800/60"
            }`}
          >
            Search your chats
          </button>
          <button
            onClick={() => onContextChange?.("docs")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              context === "docs"
                ? "bg-gradient-to-r from-[#00E0FF]/60 to-[#A855F7]/60 text-white shadow-inner"
                : "text-gray-300 hover:bg-gray-800/60"
            }`}
          >
            Search help/docs
          </button>
        </div>

        {/* === Results === */}
        <motion.div
          ref={searchResultsRef}
          onScroll={onScroll}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
          className="max-h-[320px] overflow-y-auto custom-scrollbar"
        >
          {/* Loading state */}
          {searchLoading && searchResults.length === 0 && (
            <div className="p-4 flex items-center gap-2 text-[#AAB7C4]">
              <Loader2 className="animate-spin text-[#00E0FF]" />
              <span>Searching Quirra’s memory...</span>
            </div>
          )}

          {/* Results */}
          {searchResults.map((res, idx) => {
            const title = res.title || (res.snippet ? res.snippet.split("\n")[0] : "Untitled");
            const isSelected = idx === selectedResult;
            return (
              <motion.button
                key={`${res.id}-${idx}`}
                onClick={() => onResultClick(res)}
                whileHover={{ translateY: -3 }}
                className={`w-full text-left px-4 py-3 border-b border-gray-800/60 flex gap-3 items-start transition-all duration-200 ${
                  isSelected ? "bg-[#132038]/90" : "hover:bg-[#132038]/70"
                }`}
              >
                <motion.div
                  className="flex-none mt-0.5"
                  animate={isSelected ? { y: -4 } : { y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#0E1724]/60">
                    <Search size={16} className={isSelected ? "text-[#00E0FF]" : "text-[#A0A3B1]"} />
                  </div>
                </motion.div>
                <div className="flex-1">
                  <div
                    className={`text-[15px] font-semibold ${
                      isSelected ? "text-[#00E0FF]" : "text-[#E6F1FF]"
                    }`}
                  >
                    {title}
                  </div>
                  <div className="text-[13px] text-[#AAB7C4] leading-snug mt-1">
                    {res.snippet || <span className="italic text-[#808AA1]">No preview</span>}
                  </div>
                </div>
              </motion.button>
            );
          })}

          {/* Empty State */}
          {!searchLoading && searchResults.length === 0 && searchQuery.trim().length > 0 && (
            <div className="p-8 text-center text-sm text-[#808AA1] italic">
              Start typing to explore Quirra’s knowledge.
              <div className="mt-3 animate-pulse text-[#00E0FF]/70">●</div>
            </div>
          )}

          {/* Loading More */}
          {searchLoading && searchResults.length > 0 && (
            <div className="p-3 text-sm text-[#AAB7C4] text-center">Loading more...</div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
