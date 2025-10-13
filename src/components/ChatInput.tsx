"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  Upload,
  Target,
  Smile,
  Library,
  X,
  File as FileIcon,
} from "lucide-react";

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

type QuickAction = "study" | "web" | "think";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isRegenerating: boolean;
  isChatEmpty: boolean;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onFileSelect?: (files: FileList) => void;
  onSetDailyFocus?: () => void;
  onSetGoal?: () => void;
  onLogMood?: () => void;
  onQuickAction?: (action: QuickAction) => void;
}

interface UploadedFile {
  file: File;
  url: string;
}

export default function ChatInput({
  input,
  setInput,
  isLoading,
  isRegenerating,
  isChatEmpty,
  handleSubmit,
  onFileSelect,
  onSetDailyFocus,
  onSetGoal,
  onLogMood,
  onQuickAction,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // keep a ref so we can revoke on unmount
  const uploadedFilesRef = useRef<UploadedFile[]>([]);
  useEffect(() => {
    uploadedFilesRef.current = uploadedFiles;
  }, [uploadedFiles]);

  useEffect(() => textareaRef.current?.focus(), []);

  // cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      uploadedFilesRef.current.forEach((u) => {
        try {
          URL.revokeObjectURL(u.url);
        } catch {}
      });
    };
  }, []);

  // Auto resize textarea height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight || "20");
    const maxHeight = lineHeight * 8;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  // Close "+" menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const openFilePicker = () => fileRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: UploadedFile[] = Array.from(files).map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    if (onFileSelect) onFileSelect(files);
    setShowMenu(false);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const removed = prev[index];
      try {
        URL.revokeObjectURL(removed.url);
      } catch {}
      return prev.filter((_, i) => i !== index);
    });
  };

  const doQuickAction = (action: QuickAction) => {
    setShowMenu(false);
    setShowQuickActions(false);
    if (onQuickAction) return onQuickAction(action);
    const snippetMap: Record<QuickAction, string> = {
      study: "Study & Learn — create a study plan for:",
      web: "Web Search — find latest info about:",
      think: "Think longer — deeply reflect on:",
    };
    setInput(snippetMap[action]);
  };

  /**
   * Layout behavior:
   * - When isChatEmpty: overlay (absolute inset-0) centered vertically & horizontally.
   *   The overlay uses pointer-events-none so sidebar remains interactive.
   * - Inner wrapper (the actual input card) uses pointer-events-auto so the input itself is clickable.
   * - When not empty: sticky bottom 0 location (normal chat mode).
   *
   * Framer Motion's `layout` on the inner wrapper will animate the visual shift.
   */
  const overlayClass = isChatEmpty
    ? "absolute inset-0 flex items-center justify-center pointer-events-none"
    : "sticky bottom-0 pb-4";

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className={cn("w-full flex flex-col items-center z-50 transition-all", overlayClass)}
    >
      {/* inner wrapper is layout-animated and is interactive (pointer-events-auto) */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-[740px] px-3 sm:px-4 flex flex-col items-center pointer-events-auto"
      >
        <form
          onSubmit={handleSubmit}
          className={cn(
            "relative flex flex-col gap-2 w-full rounded-3xl bg-gradient-to-br from-[#0A0B1A]/80 to-[#1B1F3B]/90 backdrop-blur-md border border-indigo-400/20 px-4 py-3 shadow-[0_0_30px_rgba(79,70,229,0.15)] transition-all duration-300",
            isFocused && "border-indigo-400/40 shadow-[0_0_40px_rgba(99,102,241,0.3)]",
            (isLoading || isRegenerating) && "opacity-70 pointer-events-none"
          )}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Uploaded Files Preview */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {uploadedFiles.map((uf, i) => {
                const isImage = uf.file.type.startsWith("image/");
                return (
                  <div
                    key={i}
                    className="relative group rounded-lg border border-indigo-400/30 bg-[#1B1F3B]/70 overflow-hidden"
                  >
                    {isImage ? (
                      <img
                        src={uf.url}
                        alt={uf.file.name}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300">
                        <FileIcon size={16} />
                        <span className="truncate max-w-[100px]">{uf.file.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-0 right-0 bg-black/60 text-white p-1 rounded-bl-md opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Input Row */}
          <div className="flex items-end gap-3">
            {/* + Button */}
            <div className="relative mr-1" ref={menuRef}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMenu((v) => !v)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-800/20 text-indigo-300 border border-indigo-400/30 hover:bg-indigo-700/30 hover:text-white transition"
              >
                <Plus size={20} />
              </motion.button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-14 left-0 w-56 bg-[#1A1F3A]/95 rounded-xl border border-indigo-500/20 shadow-xl backdrop-blur-md p-2"
                  >
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[#2a304e] text-gray-300 w-full text-left"
                    >
                      <Upload size={16} /> Upload file or image
                    </button>

                    <div className="border-t border-indigo-500/20 my-1" />

                    <button
                      type="button"
                      onClick={() => setShowQuickActions((v) => !v)}
                      className="flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-[#2a304e] text-gray-300 w-full text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Library size={16} /> Quick Actions
                      </span>
                      <span className="text-xs text-gray-400">
                        {showQuickActions ? "▲" : "▼"}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showQuickActions && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="pl-4 flex flex-col gap-1 mt-1"
                        >
                          <button
                            onClick={() => doQuickAction("study")}
                            className="text-left px-2 py-1 text-sm rounded hover:bg-[#2a304e] text-gray-300"
                          >
                            Study & Learn
                          </button>
                          <button
                            onClick={() => doQuickAction("web")}
                            className="text-left px-2 py-1 text-sm rounded hover:bg-[#2a304e] text-gray-300"
                          >
                            Web Search
                          </button>
                          <button
                            onClick={() => doQuickAction("think")}
                            className="text-left px-2 py-1 text-sm rounded hover:bg-[#2a304e] text-gray-300"
                          >
                            Think Longer
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="border-t border-indigo-500/20 my-1" />

                    <button
                      type="button"
                      onClick={onSetDailyFocus}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[#2a304e] text-gray-300 w-full text-left"
                    >
                      <Target size={16} /> Set Daily Focus
                    </button>
                    <button
                      type="button"
                      onClick={onSetGoal}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[#2a304e] text-gray-300 w-full text-left"
                    >
                      <Target size={16} /> Set Goal
                    </button>
                    <button
                      type="button"
                      onClick={onLogMood}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[#2a304e] text-gray-300 w-full text-left"
                    >
                      <Smile size={16} /> Log Mood
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isLoading ? "Quirra is thinking..." : "Type your thought..."}
              rows={1}
              disabled={isLoading || isRegenerating}
              className="flex-1 resize-none bg-transparent text-white placeholder-gray-400 outline-none text-[16px] md:text-[17px] leading-snug max-h-[150px] overflow-y-auto custom-scrollbar"
            />

            {/* Send Button */}
            {input.trim() && !isLoading && (
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Send"
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.6)] hover:shadow-[0_0_22px_rgba(99,102,241,0.9)]"
              >
                <Send size={20} />
              </motion.button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
