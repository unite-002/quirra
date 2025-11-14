"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { motion, AnimatePresence } from "framer-motion";
import { Copy } from "lucide-react";
import clsx from "clsx";

/**
 * RichMessageRenderer
 * - Accepts `content` (raw markdown), `isUser`, `isLoading`, `typingMode` (none | block | char)
 * - Emits copy events through onCopyBlock(text, blockId)
 * - Renders code blocks with copy button (no layout shift)
 * - Detects callout blocks (lines starting with emoji + label) and renders special card
 * - Converts a small set of emoji shortcodes to Unicode, and leaves others alone
 */

type TypingMode = "none" | "block" | "char";

interface Props {
  content: string | null;
  isUser?: boolean;
  isLoading?: boolean;
  typingMode?: TypingMode;
  typingSpeed?: number; // ms per char (for char mode)
  onCopyBlock?: (text: string, id: string) => void;
  className?: string;
}

export default function RichMessageRenderer({
  content,
  isUser = false,
  isLoading = false,
  typingMode = "block",
  typingSpeed = 12,
  onCopyBlock,
  className,
}: Props) {
  const [display, setDisplay] = useState<string | null>(null); // what we render (streamed)
  const [charIndex, setCharIndex] = useState(0);

  // Convert :shortcode: emoji + a few smart rules — not aggressive
  const convertEmojis = (text: string) => {
    if (!text) return "";
    const map: Record<string, string> = {
      ":smile:": "😄",
      ":laughing:": "😆",
      ":thumbsup:": "👍",
      ":thumbsdown:": "👎",
      ":rocket:": "🚀",
      ":fire:": "🔥",
      ":heart:": "❤️",
      ":check:": "✅",
      ":x:": "❌",
      ":wave:": "👋",
      ":thinking:": "🤔",
    };
    return text.replace(/:\w+:/g, (m) => map[m] ?? m);
  };

  // Split into logical blocks (callouts, paragraphs, code, lists, tables)
  // We'll split by double newlines while keeping code fences intact.
  const blocks = useMemo(() => {
    if (!content) return [];
    const raw = convertEmojis(content);
    // naive parse: split by triple-backtick blocks + other paragraphs
    const parts: string[] = [];
    const codeFenceRegex = /```([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    while ((match = codeFenceRegex.exec(raw)) !== null) {
      const start = match.index;
      const end = codeFenceRegex.lastIndex;
      const before = raw.slice(lastIndex, start);
      if (before.trim()) {
        // split before by double newlines into paragraphs
        before.split(/\n{2,}/).forEach((p) => parts.push(p));
      }
      parts.push("```" + match[1] + "```"); // include fence markers
      lastIndex = end;
    }
    const remaining = raw.slice(lastIndex);
    if (remaining.trim()) {
      remaining.split(/\n{2,}/).forEach((p) => parts.push(p));
    }
    // trim whitespace
    return parts.map((p) => p.trim()).filter(Boolean);
  }, [content]);

  // Helper to detect callout like "💡 Tip:" or "⚠️ Warning:"
  const detectCallout = (text: string) => {
    const calloutMatch = text.match(/^([^\n]{1,3})\s*([A-Za-z ]{2,20}):\s*\n?/);
    if (!calloutMatch) return null;
    const emoji = calloutMatch[1];
    const label = calloutMatch[2];
    // simple heuristic — emoji + label
    if (/^[\p{Emoji}\u2600-\u26FF]{1,3}$/u.test(emoji) || emoji.length <= 2) {
      // remove header from text
      const rest = text.replace(calloutMatch[0], "");
      return { emoji, label, rest };
    }
    return null;
  };

  // Typing behavior
  useEffect(() => {
    setCharIndex(0);
    if (!content) {
      setDisplay(null);
      return;
    }
    if (typingMode === "none" || isUser) {
      setDisplay(content);
      return;
    }
    if (typingMode === "char") {
      setDisplay("");
      setCharIndex(0);
      const total = content.length;
      const tick = () => {
        setCharIndex((ci) => {
          const next = Math.min(ci + 1, total);
          setDisplay(content.slice(0, next));
          if (next >= total) return next;
          return next;
        });
      };
      const id = setInterval(tick, typingSpeed);
      return () => clearInterval(id);
    }
    if (typingMode === "block") {
      // reveal blocks one by one with small delay
      setDisplay("");
      let idx = 0;
      const revealNext = () => {
        if (idx >= blocks.length) return;
        const accum = (prev: string) =>
          prev ? prev + "\n\n" + blocks[idx] : blocks[idx];
        setDisplay((prev) => accum(prev ?? ""));
        idx++;
        if (idx < blocks.length) {
          setTimeout(revealNext, 220 + Math.min(300, blocks[idx].length * 3));
        }
      };
      revealNext();
      return;
    }
  }, [content, typingMode, typingSpeed, blocks, isUser]);

  // UI render helpers
  const codeBlock = (raw: string, idx: number) => {
    // raw contains ```...``` with optional language
    const fenceMatch = raw.match(/```([\s\S]*?)```/);
    const inner = fenceMatch ? fenceMatch[1] : raw;
    // attempt to detect language from first line if it starts with language
    const langMatch = inner.match(/^\s*([a-zA-Z0-9+-]+)\n/);
    let lang = langMatch ? langMatch[1] : "";
    let code = inner;
    if (langMatch) {
      code = inner.replace(langMatch[0], "");
    }
    const id = `code-${idx}-${Math.abs(hashString(code)).toString(36)}`;
    return (
      <div key={id} className="quirra-code-block my-3 relative rounded-lg overflow-hidden">
        <pre className="p-3 text-sm max-h-[48vh] overflow-auto bg-[#0f1724] border border-gray-800/40 rounded-md">
          <code className={clsx(lang ? `language-${lang}` : "")}>{code}</code>
        </pre>
        <button
          aria-label="Copy code"
          onClick={() => {
            navigator.clipboard.writeText(code);
            onCopyBlock?.(code, id);
            flashCopyState(id);
          }}
          className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-[#0b1220]/70 hover:bg-[#111827] transition"
        >
          <Copy size={12} /> Copy
        </button>
      </div>
    );
  };

  // small copy flash state per id
  const [copiedFlash, setCopiedFlash] = useState<Record<string, boolean>>({});
  const flashCopyState = (id: string) => {
    setCopiedFlash((s) => ({ ...s, [id]: true }));
    setTimeout(() => setCopiedFlash((s) => ({ ...s, [id]: false })), 1400);
  };

  // very small hash
  function hashString(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  // If loading and we want a typing indicator instead of content
  if (isLoading && !content) {
    return (
      <div className={clsx("quirra-message-renderer", className)}>
        <div className="flex items-center gap-4">
          {/* left: thinking orb (consumer provides their own alt) */}
          <div className="quirra-thinking-placeholder" aria-hidden>
            <div className="w-3 h-3 rounded-full bg-[#263044] animate-pulse" />
            <div className="w-3 h-3 rounded-full bg-[#263044] animate-pulse delay-200" />
            <div className="w-3 h-3 rounded-full bg-[#263044] animate-pulse delay-400" />
          </div>
          <div className="bg-[#0b1220] p-3 rounded-lg w-full max-w-prose h-10" />
        </div>
      </div>
    );
  }

  // Final rendering: use ReactMarkdown for each block to keep GFM features
  return (
    <div className={clsx("quirra-message-renderer prose prose-invert max-w-none", className)}>
      <AnimatePresence initial={false}>
        {display !== null && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* Render blocks as separate animated items for stagger + accessibility */}
            <div className="flex flex-col gap-3">
              {blocksFromDisplay(display).map((blk, i) => {
                // detect code fence
                if (blk.trim().startsWith("```")) {
                  return codeBlock(blk, i);
                }
                // callouts detection
                const call = detectCallout(blk);
                if (call) {
                  return (
                    <motion.div
                      key={`call-${i}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: i * 0.02 }}
                      className="quirra-callout rounded-lg p-3 border border-gray-800/40 bg-gradient-to-r from-[#071021]/60 to-[#07172a]/40"
                      role="note"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">{call.emoji}</div>
                        <div>
                          <div className="font-semibold text-sm mb-1">{call.label}</div>
                          <div className="text-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                              {call.rest}
                            </ReactMarkdown>
                          </div>
                        </div>
                        <div className="ml-auto" />
                      </div>
                    </motion.div>
                  );
                }

                // regular text block — wrap in markdown renderer
                const blockId = `blk-${i}-${Math.abs(hashString(blk)).toString(36)}`;
                return (
                  <motion.div
                    key={blockId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.02 }}
                    className="quirra-block relative"
                    aria-live={isUser ? undefined : "polite"}
                  >
                    {/* per-block copy button (only if block length > threshold or contains code/table) */}
                    {needsCopyButton(blk) && (
                      <button
                        aria-label="Copy block"
                        onClick={() => {
                          navigator.clipboard.writeText(stripMarkdown(blk));
                          onCopyBlock?.(stripMarkdown(blk), blockId);
                          flashCopyState(blockId);
                        }}
                        className="absolute right-2 top-0 -translate-y-1/2 px-2 py-1 text-xs rounded bg-[#0b1220]/70 hover:bg-[#111827] transition"
                      >
                        <Copy size={12} />
                        <span className="sr-only">Copy</span>
                      </button>
                    )}

                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        p({ node, children }) {
                          return <p className="text-[15px] leading-relaxed mb-2">{children}</p>;
                        },
                        ul({ children }) {
                          return <ul className="ml-5 list-disc space-y-1">{children}</ul>;
                        },
                        ol({ children }) {
                          return <ol className="ml-5 list-decimal space-y-1">{children}</ol>;
                        },
                        blockquote({ children }) {
                          return (
                            <blockquote className="pl-3 border-l-2 border-gray-700/40 italic text-sm text-gray-300">
                              {children}
                            </blockquote>
                          );
                        },
                        table({ children }) {
                          return <div className="overflow-x-auto rounded-md border border-gray-800/30">{children}</div>;
                        },
                        code({ inline, className, children, ...props }: any) {
                          if (inline) {
                            return <code className="inline-code px-1 py-[2px] rounded bg-gray-700/30">{children}</code>;
                          }
                          // fallback: render block inside pre, but code fences were earlier handled
                          return (
                            <pre className="p-3 text-sm bg-[#0f1724] rounded-md overflow-auto">
                              <code className={className}>{children}</code>
                            </pre>
                          );
                        },
                      }}
                    >
                      {blk}
                    </ReactMarkdown>

                    {/* copy flash */}
                    {copiedFlash[blockId] && (
                      <div className="absolute -top-6 right-2 text-[12px] text-green-400">Copied ✓</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Utilities
  function needsCopyButton(txt: string) {
    const stripped = stripMarkdown(txt);
    return stripped.length > 40 || /```|<table|^\s*\*|^\s*-/m.test(txt);
  }

  function stripMarkdown(md: string) {
    // very small sanitizer — remove code fences and md syntax for copy
    return md.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, "")).replace(/[#>*_`]/g, "").trim();
  }

  function blocksFromDisplay(displayText: string) {
    // mirror `blocks` but for the current display text (streamed)
    // simple split by double newlines but keep fences
    const parts: string[] = [];
    const codeFenceRegex = /```([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    while ((match = codeFenceRegex.exec(displayText)) !== null) {
      const start = match.index;
      const end = codeFenceRegex.lastIndex;
      const before = displayText.slice(lastIndex, start);
      if (before.trim()) before.split(/\n{2,}/).forEach((p) => parts.push(p));
      parts.push("```" + match[1] + "```");
      lastIndex = end;
    }
    const remaining = displayText.slice(lastIndex);
    if (remaining.trim()) remaining.split(/\n{2,}/).forEach((p) => parts.push(p));
    return parts.filter(Boolean);
  }
}
