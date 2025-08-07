"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Loader2 } from "lucide-react";

// Simple utility to conditionally join class names (similar to clsx or classnames)
// This is included here for self-containment and to ensure the component runs
// without needing an external '@/utils/cn' import in this specific environment.
function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(" ");
}

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isRegenerating: boolean;
  isChatEmpty: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export const ChatInput = ({
  input,
  setInput,
  isLoading,
  isRegenerating,
  isChatEmpty,
  handleSubmit,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      const lineHeight = parseFloat(getComputedStyle(textareaRef.current).lineHeight);
      const maxHeight = lineHeight * 5; // Max 5 lines
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
      if (textareaRef.current.scrollHeight > maxHeight) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFocus = () => setIsTyping(true);
  const handleBlur = () => setIsTyping(false);

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40 p-4 transition-all duration-300",
      "lg:left-16" // Adjust for fixed vertical nav on larger screens
    )}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "max-w-4xl mx-auto flex items-end w-full rounded-2xl",
          "bg-[#1a213a]/80 backdrop-blur-sm shadow-xl border border-gray-700 p-2",
          "transition-all duration-300 transform animate-scaleIn",
          "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-[#1a213a]"
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isTyping ? "Write your message..." : (isChatEmpty ? "Start a new conversation..." : "Continue the conversation...")}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none border-none py-2 px-4 text-white placeholder-gray-400 overflow-hidden min-h-[48px]"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading || isRegenerating}
          className={cn(
            "p-3 rounded-xl transition-all duration-300 ease-in-out",
            "bg-transparent text-gray-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            (input.trim() && !isLoading && !isRegenerating) && "bg-blue-600 text-white shadow-lg",
            (input.trim() && !isLoading && !isRegenerating) && "hover:bg-blue-700",
            (input.trim() && !isLoading && !isRegenerating) && "animate-pulse" // Pulsing effect for ready-to-send
          )}
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>
    </div>
  );
};
