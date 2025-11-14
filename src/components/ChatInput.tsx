"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  Upload,
  Target,
  Lightbulb,
  Palette,
  BookOpen,
  Image as ImageIcon,
  X,
} from "lucide-react";


/* ---------------------------
   Utility
---------------------------- */
function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

/* ---------------------------
   Shared Chat Message Type
---------------------------- */
export interface ChatMessage {
  id?: string;
  role: "system" | "user" | "assistant";
  content: string;
  type?: "text" | "image" | "file";
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
}

/* ---------------------------
   Props & Local Types
---------------------------- */
type QuickAction = "study" | "web" | "think";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isRegenerating: boolean;
  isChatEmpty: boolean;
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    commandType?: string | null
  ) => Promise<void>;
  onFileSelect?: (files: FileList) => void;
  onQuickAction?: (action: QuickAction) => void;

  ariaLabel?: string;
  className?: string;
}

interface UploadedFile {
  file: File;
  url: string;
  type: "image" | "file";
}

/* ---------------------------
   Command Items
---------------------------- */
const COMMAND_ITEMS = [
  {
    id: "idea",
    label: "New Idea",
    icon: Lightbulb,
    glow: "from-cyan-400/60 to-cyan-600/30",
  },
  {
    id: "upload",
    label: "Upload File / Image",
    icon: Upload,
    glow: "from-violet-400/60 to-violet-600/30",
  },
  {
    id: "design",
    label: "Generate Design",
    icon: Palette,
    glow: "from-pink-400/60 to-indigo-500/30",
  },
  {
    id: "study",
    label: "Study & Learn",
    icon: BookOpen,
    glow: "from-emerald-400/60 to-cyan-400/30",
  },
  {
    id: "task",
    label: "Smart Task",
    icon: Target,
    glow: "from-blue-400/60 to-violet-500/30",
  },
];

/* ---------------------------
   Component
---------------------------- */
export default function ChatInput({
  input,
  setInput,
  isLoading,
  isRegenerating,
  isChatEmpty,
  handleSubmit,
  onFileSelect,
  ariaLabel,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const plusButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [commandType, setCommandType] = useState<string | null>(null);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const [showNeuralPanel, setShowNeuralPanel] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => textareaRef.current?.focus(), []);

  /* ---------------------------
     Placeholder rotation
  ---------------------------- */
  const placeholders = [
    "Type your thought…",
    "Drop a file to analyze…",
    "Ask me anything…",
  ];

  useEffect(() => {
    if (isLoading) return;
    const id = setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % placeholders.length),
      6000
    );
    return () => clearInterval(id);
  }, [isLoading]);

  /* ---------------------------
     Auto resize textarea
  ---------------------------- */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [input]);

  /* ---------------------------
     File / Image Upload
  ---------------------------- */
  const openFilePicker = useCallback(() => fileRef.current?.click(), []);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: UploadedFile[] = Array.from(files).map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      type: f.type.startsWith("image/") ? "image" : "file",
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    onFileSelect?.(files);
    e.target.value = "";
  };
  const removeFile = (url: string) =>
    setUploadedFiles((prev) => prev.filter((f) => f.url !== url));

  /* ---------------------------
     Submit Logic
  ---------------------------- */
  const handleSubmitWrapper = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isLoading || isRegenerating) return;
      if (!input.trim() && uploadedFiles.length === 0) return;
      await handleSubmit(e, commandType);
      setInput("");
      setUploadedFiles([]);
      setActiveCommand(null);
      setCommandType(null);
      if (!hasSentFirstMessage) setHasSentFirstMessage(true);
    },
    [
      handleSubmit,
      input,
      isLoading,
      isRegenerating,
      uploadedFiles,
      hasSentFirstMessage,
      commandType,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmitWrapper(e as any);
      }
    },
    [handleSubmitWrapper]
  );

  /* ---------------------------
     + Panel Logic
  ---------------------------- */
  const computePanelPositionFromPlus = useCallback(() => {
    const btn = plusButtonRef.current;
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const panelHeight = 260;
    const top =
      isChatEmpty && !hasSentFirstMessage
        ? rect.bottom + 12
        : Math.max(rect.top - panelHeight - 12, 8);
    const left = Math.min(Math.max(rect.left, 12), window.innerWidth - 272);
    return { top, left };
  }, [isChatEmpty, hasSentFirstMessage]);

  const openNeuralPanel = useCallback(() => {
    setShowNeuralPanel(true);
    const pos = computePanelPositionFromPlus();
    if (pos) setPanelPos(pos);
  }, [computePanelPositionFromPlus]);

  const closeNeuralPanel = useCallback(() => setShowNeuralPanel(false), []);

  useEffect(() => {
    if (!showNeuralPanel) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !plusButtonRef.current?.contains(e.target as Node)
      )
        closeNeuralPanel();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNeuralPanel();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showNeuralPanel, closeNeuralPanel]);

  const commandPlaceholderMap: Record<string, string> = {
    idea: "Describe your new idea…",
    upload: "Attach a file or image…",
    design: "Describe what you want to visualize…",
    study: "What topic do you want to study today?",
    task: "Describe your task or goal…",
  };

  const computedPlaceholder = activeCommand
    ? commandPlaceholderMap[activeCommand]
    : placeholders[placeholderIndex];
  const showPlaceholder = (input || "").trim().length === 0;

  /* ---------------------------
     Render
  ---------------------------- */
  return (
    <>
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        className="w-full flex flex-col items-center z-50 sticky bottom-0 pb-4 bg-transparent"
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 lg:px-0 flex flex-col items-center"
        >
          <motion.form
            onSubmit={handleSubmitWrapper}
            className={cn(
              "quirra-input relative flex flex-col gap-2 w-full rounded-3xl px-4 py-3 transition-all duration-300",
              "bg-gradient-to-br from-[#0A0B1A]/80 to-[#1B1F3B]/90 backdrop-blur-xl border border-indigo-400/20 shadow-[0_0_30px_rgba(79,70,229,0.15)] focus-within:shadow-[0_0_30px_rgba(99,102,241,0.25)]",
              className
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

            <div className="flex items-end gap-3 relative z-10">
              {/* + Button */}
              <motion.button
                ref={plusButtonRef}
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                onClick={() =>
                  showNeuralPanel ? closeNeuralPanel() : openNeuralPanel()
                }
                className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-800/20 text-indigo-300 border border-indigo-400/30 hover:bg-indigo-700/30 hover:text-white transition focus:outline-none"
              >
                <Plus size={20} />
              </motion.button>

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isRegenerating}
                  aria-label={ariaLabel || "Chat message input"}
                  className="w-full resize-none bg-transparent text-white placeholder-transparent outline-none text-[16px] leading-[1.45rem] py-[2px] max-h-[150px] overflow-y-auto"
                />
                {showPlaceholder && (
                  <motion.span
                    key={computedPlaceholder}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="absolute left-0 top-[6px] px-[2px] text-gray-400 select-none text-[15px]"
                  >
                    {computedPlaceholder}
                  </motion.span>
                )}
              </div>

              {/* Send Button */}
              {(input.trim() || uploadedFiles.length > 0) && (
                <motion.button
                  key="send-button"
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.6)] hover:shadow-[0_0_22px_rgba(99,102,241,0.9)] transition-all"
                >
                  <Send size={18} />
                </motion.button>
              )}
            </div>

            {/* Uploaded Files Preview */}
            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-2 flex flex-wrap gap-2"
                >
                  {uploadedFiles.map((file) => (
                    <motion.div
                      key={file.url}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative group rounded-xl overflow-hidden border border-indigo-400/20 bg-white/5 backdrop-blur-sm"
                    >
                      {file.type === "image" ? (
                        <img
                          src={file.url}
                          alt={file.file.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <ImageIcon size={16} className="text-indigo-300" />
                          <span className="text-sm truncate max-w-[100px] text-gray-200">
                            {file.file.name}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => removeFile(file.url)}
                        className="absolute top-1 right-1 bg-black/40 hover:bg-black/70 rounded-full p-[2px]"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Command Tag */}
            <AnimatePresence>
              {activeCommand && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="mt-2 flex items-center gap-2"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-gray-100 border border-white/10 bg-white/5 backdrop-blur-sm">
                    {(() => {
                      const item = COMMAND_ITEMS.find(
                        (c) => c.id === activeCommand
                      );
                      if (!item) return null;
                      const Icon = item.icon as any;
                      return <Icon size={15} className="text-indigo-200" />;
                    })()}
                    <span className="text-[13px]">
                      {COMMAND_ITEMS.find(
                        (c) => c.id === activeCommand
                      )?.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCommand(null);
                        setCommandType(null);
                      }}
                      className="ml-1 rounded-full hover:bg-white/10 p-[2px]"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        </motion.div>
      </motion.div>

      {/* + Panel */}
      <AnimatePresence>
        {showNeuralPanel && panelPos && (
          <motion.div
            ref={panelRef}
            key="command-panel"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="fixed z-[999] w-[260px] p-3 rounded-2xl border border-indigo-400/20 backdrop-blur-xl bg-gradient-to-br from-[#0A0B1A]/85 to-[#1B1F3B]/90 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
            style={{
              top: `${panelPos.top}px`,
              left: `${panelPos.left}px`,
            }}
          >
            <motion.div
              className="flex flex-col gap-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.06 } },
              }}
            >
              {COMMAND_ITEMS.map((item) => (
                <motion.button
                  key={item.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    if (item.id === "upload") openFilePicker();
                    else {
                      setActiveCommand(item.id);
                      setCommandType(item.id);
                      setTimeout(() => textareaRef.current?.focus(), 50);
                    }
                    closeNeuralPanel();
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-gray-200 hover:text-white bg-white/0 hover:bg-gradient-to-r ${item.glow}`}
                >
                  <item.icon size={18} className="text-indigo-300" />
                  <span className="text-sm font-medium">{item.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        textarea { caret-color: #bcbcff; }
        .quirra-input:focus-within {
          box-shadow: 0 0 12px rgba(99,102,241,0.25),
                      inset 0 0 8px rgba(79,70,229,0.1);
          transition: box-shadow 0.25s ease;
        }
        .quirra-input textarea::-webkit-scrollbar { width: 6px; }
        .quirra-input textarea::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(22, 19, 90, 0.25), rgba(22, 23, 71, 0.35));
          border-radius: 8px;
        }
      `}</style>
    </>
  );
}
