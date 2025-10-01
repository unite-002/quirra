"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Loader2, Plus, Upload, Target, Smile, Library } from "lucide-react";

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
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  onFileSelect?: (files: FileList) => void;
  onPhotoSelect?: (files: FileList) => void;
  onSetDailyFocus?: () => void;
  onSetGoal?: () => void;
  onLogMood?: () => void;
  onQuickAction?: (action: QuickAction) => void;
}

const SUGGESTIONS = [
  "Summarize this for me",
  "Write a quick email",
  "Explain like I'm 5",
];

export default function ChatInput({
  input,
  setInput,
  isLoading,
  isRegenerating,
  isChatEmpty,
  handleSubmit,
  onFileSelect,
  onPhotoSelect,
  onSetDailyFocus,
  onSetGoal,
  onLogMood,
  onQuickAction,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Auto-focus when mounted
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Dynamic resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight || "20");
    const maxHeight = lineHeight * 8;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const openFilePicker = () => fileRef.current?.click();
  const openPhotoPicker = () => photoRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onFileSelect) onFileSelect(e.target.files);
    setShowMenu(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onPhotoSelect) onPhotoSelect(e.target.files);
    setShowMenu(false);
  };

  const doQuickAction = (action: QuickAction) => {
    setShowMenu(false);
    setShowQuickActions(false);

    if (onQuickAction) return onQuickAction(action);

    const snippetMap: Record<QuickAction, string> = {
      study: "Study & Learn — create a study plan and resources for:",
      web: "Web Search — find latest resources and summarize results for:",
      think: "Think longer — deeply analyze and expand on:",
    };
    setInput(input ? `${input} ${snippetMap[action]}` : snippetMap[action]);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-4 pt-3 bg-gradient-to-b from-transparent to-[#131422]/90">
      {/* Suggestion chips */}
      {isChatEmpty && (
        <div className="flex gap-2 mb-3 max-w-3xl mx-auto justify-center">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(input ? input + " " + s : s)}
              className="px-3 py-1.5 text-sm bg-[#2a304e] text-gray-200 rounded-lg hover:bg-[#3a4060] transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={cn(
          "max-w-3xl mx-auto flex items-end w-full rounded-2xl bg-[#131422] shadow-lg border border-gray-700 px-4 py-3 relative transition-all duration-300",
          isTyping && "ring-1 ring-blue-500"
        )}
      >
        {/* Hidden inputs */}
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        <input ref={photoRef} type="file" multiple className="hidden" onChange={handlePhotoChange} accept="image/*" />

        {/* + menu */}
        <div className="relative z-10 mr-2">
          <button
            type="button"
            onClick={() => setShowMenu((s) => !s)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-full transition",
              showMenu ? "bg-[#2a304e]" : "hover:bg-[#2a304e]"
            )}
          >
            <Plus size={18} className="text-gray-300" />
          </button>

          {showMenu && (
            <div className="absolute bottom-12 left-0 w-[220px] bg-[#1a213a] rounded-lg shadow-xl border border-gray-700 z-20 flex flex-col p-2 animate-slideUpAndFade">
              <button type="button" onClick={openPhotoPicker} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-700 text-gray-300">
                <Upload size={16} /> Upload photo(s)
              </button>
              <button type="button" onClick={openFilePicker} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-700 text-gray-300">
                <Upload size={16} /> Upload file(s)
              </button>
              <div className="border-t border-gray-700 my-1" />
              <button type="button" onClick={() => setShowQuickActions((v) => !v)} className="flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-700 text-gray-300">
                <span className="flex items-center gap-3"><Library size={16} /> Quick actions</span>
                <span className="text-xs text-gray-400">{showQuickActions ? "▲" : "▼"}</span>
              </button>
              {showQuickActions && (
                <div className="pl-3 flex flex-col gap-1 mt-1">
                  <button type="button" onClick={() => doQuickAction("study")} className="text-left px-2 py-1 text-sm rounded hover:bg-gray-700 text-gray-300">Study & Learn</button>
                  <button type="button" onClick={() => doQuickAction("web")} className="text-left px-2 py-1 text-sm rounded hover:bg-gray-700 text-gray-300">Web Search</button>
                  <button type="button" onClick={() => doQuickAction("think")} className="text-left px-2 py-1 text-sm rounded hover:bg-gray-700 text-gray-300">Think Longer</button>
                </div>
              )}
              <div className="border-t border-gray-700 my-1" />
              <button type="button" onClick={onSetDailyFocus} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-700 text-gray-300">
                <Target size={16} /> Set Daily Focus
              </button>
              <button type="button" onClick={onSetGoal} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-700 text-gray-300">
                <Target size={16} /> Set Goal
              </button>
              <button type="button" onClick={onLogMood} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-700 text-gray-300">
                <Smile size={16} /> Log Mood
              </button>
            </div>
          )}
        </div>

        {/* textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
            placeholder={isChatEmpty ? "Message Quirra..." : "Type your message..."}
            rows={1}
            className="w-full resize-none bg-transparent outline-none py-2 pl-2 pr-11 text-white placeholder-gray-400 max-h-[200px] text-base leading-relaxed"
          />
          {/* send overlay */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isRegenerating}
            className={cn(
              "absolute bottom-2 right-2 flex items-center justify-center w-8 h-8 rounded-lg transition",
              input.trim() && !isLoading && !isRegenerating
                ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-400"
            )}
          >
            {isLoading || isRegenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      <p className="text-[12px] text-gray-400 text-center mt-2">
        Press <kbd className="px-1 py-0.5 rounded bg-gray-800 mx-1">Enter</kbd> to send •{" "}
        <kbd className="px-1 py-0.5 rounded bg-gray-800 mx-1">Shift</kbd>+<kbd className="px-1 py-0.5 rounded bg-gray-800 mx-1">Enter</kbd> for newline
      </p>
    </div>
  );
}
