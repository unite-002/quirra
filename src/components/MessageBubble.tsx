"use client";

import React, { useEffect, useState } from "react";
import { ThinkingOrb } from "@/components/ThinkingOrb";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Edit } from "lucide-react";
import "@/styles/markdown.css";

interface MessageBubbleProps {
  content: string | null;
  isLoading?: boolean;
  isUser?: boolean;
  onEdit?: () => void;
  typingSpeed?: number;
}

export default function MessageBubble({
  content,
  isLoading = false,
  isUser = false,
  onEdit,
  typingSpeed = 15,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [displayText, setDisplayText] = useState<string>("");
  const [finished, setFinished] = useState(false);

  // 🧠 Typing animation
  useEffect(() => {
    if (isLoading || !content) {
      setDisplayText("");
      return;
    }

    let currentIndex = 0;
    setDisplayText("");
    setFinished(false);

    const interval = setInterval(() => {
      currentIndex++;
      setDisplayText(content.slice(0, currentIndex));
      if (currentIndex >= content.length) {
        clearInterval(interval);
        setFinished(true);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [content, typingSpeed, isLoading]);

  const handleCopy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div
      className={`relative group my-4 p-5 rounded-2xl shadow-sm border border-[#1b2739]/40 backdrop-blur-sm transition-all ${
        isUser
          ? "bg-[#111827] text-gray-100 self-end"
          : "bg-[#0B1120] text-gray-100 self-start"
      } max-w-[80%]`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-6">
          <ThinkingOrb isThinking size={42} />
        </div>
      ) : (
        <>
          {/* 🪶 Message Text */}
          <div
            className={`markdown-body prose prose-invert max-w-none transition-opacity duration-500 ${
              finished ? "opacity-100" : "opacity-90"
            }`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  if (!inline) {
                    return (
                      <div className="relative group/code my-2 rounded-lg overflow-hidden border border-[#1e293b] bg-[#0f172a]">
                        <pre
                          {...(props as React.DetailedHTMLProps<
                            React.HTMLAttributes<HTMLPreElement>,
                            HTMLPreElement
                          >)}
                          className={`text-[13px] leading-relaxed ${className}`}
                        >
                          <code>{children}</code>
                        </pre>
                        <button
                          onClick={() => handleCopy(String(children))}
                          className="absolute top-2 right-2 px-2 py-1 rounded-md bg-[#1e293b]/80 hover:bg-[#334155] text-xs text-gray-300 opacity-0 group-hover/code:opacity-100 transition-all"
                        >
                          Copy
                        </button>
                      </div>
                    );
                  }
                  return (
                    <code
                      {...props}
                      className="px-1 py-0.5 rounded-md bg-[#1e293b] text-gray-200 text-[13px]"
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return (
                    <p className="mb-3 text-[15px] leading-relaxed text-gray-200">
                      {children}
                    </p>
                  );
                },
                strong({ children }) {
                  return <strong className="text-gray-100">{children}</strong>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-blue-500/50 pl-3 italic text-gray-400 my-3">
                      {children}
                    </blockquote>
                  );
                },
                ul({ children }) {
                  return (
                    <ul className="list-disc ml-5 space-y-1 text-gray-300">
                      {children}
                    </ul>
                  );
                },
                ol({ children }) {
                  return (
                    <ol className="list-decimal ml-5 space-y-1 text-gray-300">
                      {children}
                    </ol>
                  );
                },
              }}
            >
              {displayText}
            </ReactMarkdown>
          </div>

          {/* 🧰 Toolbar (non-moving, subtle hover) */}
          <div className="absolute right-2 bottom-2 flex gap-2 items-center pointer-events-none">
            <div
              className={`flex gap-2 items-center opacity-0 transition-opacity duration-150 ${
                hovered ? "opacity-100" : ""
              } pointer-events-auto`}
            >
              {isUser && (
                <button
                  onClick={onEdit}
                  className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
                >
                  <Edit size={14} /> Edit
                </button>
              )}
              <button
                onClick={() => handleCopy(content || "")}
                className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
