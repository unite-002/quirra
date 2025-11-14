"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { Search, XCircle } from "lucide-react";

type SearchResult = {
  id: string;
  title?: string;
  snippet?: string;
  kind?: string;
  chat_session_id?: string; // ✅ Added for chat linking
  date: string; // ISO string required
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
}: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // === Auto-focus when open ===
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // === Close when clicking outside ===
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // === Close with ESC ===
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // === Keyboard navigation (Enter selects) ===
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!searchResults.length) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (searchResults[selectedResult]) onResultClick(searchResults[selectedResult]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedResult, searchResults, onResultClick]);

  if (!isOpen) return null;

  // === Helper: format date into sections like ChatGPT ===
  const getSectionLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 86400000;

    if (diff < oneDay && now.getDate() === date.getDate()) return "Today";
    if (diff < 2 * oneDay && now.getDate() - date.getDate() === 1) return "Yesterday";
    if (diff < 7 * oneDay) return "Last 7 days";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  // === Group results by section ===
  const groupedResults: Record<string, SearchResult[]> = {};
  searchResults
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((res) => {
      const section = getSectionLabel(res.date);
      if (!groupedResults[section]) groupedResults[section] = [];
      groupedResults[section].push(res);
    });

  return (
    <AnimatePresence>
      {isOpen && (
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
              background:
                "linear-gradient(180deg, rgba(13,14,28,0.92) 0%, rgba(21,23,42,0.92) 100%)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              boxShadow:
                "0 8px 32px rgba(0, 224, 255, 0.12), 0 4px 18px rgba(168, 85, 247, 0.08)",
              border: "1px solid rgba(80,100,140,0.10)",
            }}
            className="relative w-full max-w-[600px] rounded-[22px] overflow-hidden"
          >
            {/* Ambient Glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[22px] -z-10"
              style={{
                background:
                  "radial-gradient(300px 120px at 10% 20%, rgba(0,224,255,0.06), transparent 18%), radial-gradient(200px 90px at 90% 80%, rgba(168,85,247,0.05), transparent 22%)",
              }}
            />

            {/* Top Bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/70">
              <Search size={20} className="text-[#8CA0B3]" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search..."
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

            {/* Results */}
            <motion.div
              ref={searchResultsRef}
              onScroll={onScroll}
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
              className="max-h-[380px] overflow-y-auto custom-scrollbar"
            >
              {searchLoading && searchResults.length === 0 && (
                <div className="p-5 space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="h-4 w-3/4 bg-[#1e2b42]/60 rounded-md" />
                      <div className="h-3 w-2/4 bg-[#1a2337]/60 rounded-md" />
                    </div>
                  ))}
                </div>
              )}

              {!searchLoading &&
                searchResults.length > 0 &&
                Object.entries(groupedResults).map(([section, results]) => (
                  <div key={section} className="mt-3">
                    <div className="px-5 py-2 text-[#9BA8B5] text-sm font-semibold">{section}</div>
                    {results.map((res, idx) => {
                      const title =
                        res.title || (res.snippet ? res.snippet.split("\n")[0] : "Untitled");
                      const isSelected = idx === selectedResult;
                      return (
                        <motion.button
                          key={res.id}
                          onClick={() => onResultClick(res)} // ✅ Works properly
                          whileHover={{ translateY: -2 }}
                          className={`w-full text-left px-5 py-3 border-b border-gray-800/60 flex gap-3 items-start transition-all duration-200 ${
                            isSelected ? "bg-[#132038]/90" : "hover:bg-[#132038]/70"
                          }`}
                        >
                          <div className="flex-none mt-0.5">
                            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#0E1724]/60">
                              <Search
                                size={16}
                                className={
                                  isSelected ? "text-[#00E0FF]" : "text-[#A0A3B1]"
                                }
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-semibold truncate text-[#E6F1FF]">
                              {title}
                            </div>
                            <div className="text-[13px] text-[#AAB7C4] leading-snug mt-1 line-clamp-2">
                              {res.snippet || (
                                <span className="italic text-[#808AA1]">
                                  No preview available
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
