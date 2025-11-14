"use client";
import { useState, useRef, useEffect } from "react";
import {
  Copy,
  Share2,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Edit3,
  Clock,
  Link2,
  X,
  Loader2,
  Globe,
} from "lucide-react";
import { FaReddit } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import "@/components/markdownStyles.css";

interface Props {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  onCopy: (text: string, id: string) => void;
  onLike?: (id: string) => void;
  onDislike?: (id: string) => void;
  onRegenerate?: (msg: { id: string; content: string }) => void;
  onSaveEdit?: (id: string, newText: string) => void;
  onCancelEdit?: (id: string) => void;
}

export default function MessageToolbar({
  messageId,
  role,
  content,
  onCopy,
  onLike,
  onDislike,
  onRegenerate,
  onSaveEdit,
  onCancelEdit,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(content);
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loadingShare, setLoadingShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isUser = role === "user";
  const userBg = "rgba(25, 28, 46, 0.92)";
  const aiBg = "transparent";

  // 🧠 Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!isEditing || !el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 320) + "px";
  }, [text, isEditing]);

  // 🕓 Load edit history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const { data } = await supabase
          .from("message_edits")
          .select("previous_content")
          .eq("message_id", messageId)
          .order("created_at", { ascending: false });
        if (data) setEditHistory(data.map((d) => d.previous_content));
      } catch (err) {
        console.error("❌ Failed to load edit history:", err);
      }
    };
    if (isUser) loadHistory();
  }, [messageId, isUser]);

  // 📤 Generate share link
  const generateShareLink = async () => {
    try {
      setLoadingShare(true);
      setShareLink(null);

      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      const res = await fetch("/api/shares", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ conversation_id: messageId }),
      });

      const data = await res.json();
      if (data.url) {
        setShareLink(data.url);
      } else {
        console.error("❌ Failed to generate share link:", data);
        alert("Something went wrong generating the share link.");
      }
    } catch (err) {
      console.error("❌ Share link error:", err);
      alert("Something went wrong generating the share link.");
    } finally {
      setLoadingShare(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div
        className={clsx(
          "relative flex flex-col gap-1 w-full group",
          isUser ? "items-end" : "items-start"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <AnimatePresence mode="wait">
          {!isEditing ? (
            <>
              <motion.div
                key="bubble"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={clsx(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[75%] markdown-body relative",
                  isUser
                    ? "rounded-br-none text-white"
                    : "rounded-bl-none text-gray-200"
                )}
                style={{ background: isUser ? userBg : aiBg }}
              >
                <ReactMarkdown
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code({
                      inline,
                      className,
                      children,
                      ...props
                    }: {
                      inline?: boolean;
                      className?: string;
                      children?: React.ReactNode;
                    }) {
                      if (inline) {
                        return (
                          <code className="inline-code" {...props}>
                            {children}
                          </code>
                        );
                      }

                      const language = className
                        ? className.replace("language-", "")
                        : "";
                      const [copiedState, setCopiedState] = useState(false);

                      const handleCopy = async () => {
                        try {
                          const textToCopy = String(children ?? "").replace(
                            /\n$/,
                            ""
                          );
                          await navigator.clipboard.writeText(textToCopy);
                          setCopiedState(true);
                          setTimeout(() => setCopiedState(false), 1500);
                        } catch (e) {
                          console.error("Copy failed", e);
                        }
                      };

                      return (
                        <div className="code-block-wrapper group relative">
                          <button
                            className="code-copy-btn absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded-md border border-gray-700/50"
                            onClick={handleCopy}
                          >
                            {copiedState ? "Copied!" : "Copy"}
                          </button>

                          <pre
                            className={clsx("code-block-pre", className)}
                            aria-label={`code-${language}`}
                          >
                            <code className={className}>{children}</code>
                          </pre>
                        </div>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>

                {/* 🕓 Edit history */}
                {isUser && editHistory.length > 0 && (
                  <div className="flex items-center justify-end mt-1">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
                    >
                      <Clock size={12} />
                      <span>
                        Edited · {editHistory.length}{" "}
                        {editHistory.length === 1 ? "edit" : "edits"}
                      </span>
                    </button>
                  </div>
                )}

                {showHistory && (
                  <div className="mt-2 border border-gray-700/40 rounded-md bg-[#11131F]/80 p-2 text-xs text-gray-300 max-h-48 overflow-y-auto">
                    {editHistory.map((old, i) => (
                      <div
                        key={i}
                        className="border-b border-gray-700/50 pb-1 mb-1 last:border-none"
                      >
                        {old}
                      </div>
                    ))}
                  </div>
                )}

                {/* 🧰 Toolbar on Hover — FIXED: Absolute to prevent bubble movement */}
                <AnimatePresence>
                  {hovered && (
                    <motion.div
                      key="toolbar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={clsx(
                        "absolute flex items-center gap-3 text-gray-400 text-xs z-10",
                        isUser ? "justify-end" : "justify-start"
                      )}
                      style={{
                        top: "100%",
                        marginTop: "-0.25rem", // keep same position as before
                        right: isUser ? "0" : "auto",
                        left: !isUser ? "0" : "auto",
                      }}
                    >
                      <button
                        onClick={() => onCopy(content, messageId)}
                        className="transition-transform hover:scale-110 hover:text-white"
                        title="Copy"
                      >
                        <Copy size={16} />
                      </button>

                      {role === "assistant" && (
                        <>
                          <button
                            onClick={() => setShowShareModal(true)}
                            className="hover:text-white transition-transform hover:scale-110"
                            title="Share"
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => onLike?.(messageId)}
                            className="hover:text-white transition-transform hover:scale-110"
                            title="Like"
                          >
                            <ThumbsUp size={16} />
                          </button>
                          <button
                            onClick={() => onDislike?.(messageId)}
                            className="hover:text-white transition-transform hover:scale-110"
                            title="Dislike"
                          >
                            <ThumbsDown size={16} />
                          </button>
                          <button
                            onClick={() =>
                              onRegenerate?.({ id: messageId, content })
                            }
                            className="hover:text-white transition-transform hover:scale-110"
                            title="Regenerate"
                          >
                            <RotateCcw size={16} />
                          </button>
                        </>
                      )}

                      {isUser && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="transition-transform hover:scale-110 text-white"
                          title="Edit message"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          ) : (
            /* ✏️ Edit Mode */
            <motion.div
              key="edit"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-3xl"
            >
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: userBg, color: "white" }}
              >
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Edit your message..."
                  className="w-full bg-transparent resize-none focus:outline-none text-[15px] leading-7 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                  style={{
                    maxHeight: "320px",
                    scrollbarColor: "#3b3b3b rgba(25,28,46,0.6)",
                  }}
                  rows={4}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end mt-2 text-sm">
                <button
                  onClick={() => {
                    setText(content);
                    setIsEditing(false);
                    onCancelEdit?.(messageId);
                  }}
                  className="px-3 py-1.5 rounded-md bg-gray-700/60 text-gray-100 hover:bg-gray-600/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSaveEdit?.(messageId, text);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 rounded-md text-white transition-colors"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.85) 0%, rgba(139,92,246,0.85) 100%)",
                  }}
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🌐 Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-[#0B0D17] border border-gray-700/50 rounded-2xl p-8 w-full max-w-3xl shadow-2xl relative"
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-semibold text-gray-100 mb-3">
                Share this conversation
              </h2>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Generate a secure link that allows others to view this chat.
                Once generated, you can copy the link or share directly to your favorite platforms.
              </p>

              {!shareLink ? (
                <button
                  onClick={generateShareLink}
                  disabled={loadingShare}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-blue-500/80 to-violet-500/80 text-white hover:opacity-90 transition"
                >
                  {loadingShare ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Generating link...
                    </>
                  ) : (
                    <>
                      <Link2 size={18} /> Generate Share Link
                    </>
                  )}
                </button>
              ) : (
                <>
                  <div className="mt-4 p-3 rounded-lg bg-[#11131F] border border-gray-700/60">
                    <input
                      readOnly
                      value={shareLink}
                      className="w-full bg-transparent text-gray-300 text-sm focus:outline-none"
                      onClick={handleCopyLink}
                    />
                    {copied && (
                      <p className="text-[11px] text-green-400 mt-1">
                        ✅ Link copied
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-6 text-sm text-gray-300">
                    <button
                      onClick={() =>
                        openWindow(
                          `https://twitter.com/intent/tweet?text=Check%20out%20this%20chat!&url=${encodeURIComponent(
                            shareLink
                          )}`
                        )
                      }
                      className="flex items-center gap-2 hover:text-white"
                    >
                      <Globe size={16} /> X (Twitter)
                    </button>
                    <button
                      onClick={() =>
                        openWindow(
                          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                            shareLink
                          )}`
                        )
                      }
                      className="flex items-center gap-2 hover:text-white"
                    >
                      <Globe size={16} /> LinkedIn
                    </button>
                    <button
                      onClick={() =>
                        openWindow(
                          `https://www.reddit.com/submit?title=Chat%20Snapshot&url=${encodeURIComponent(
                            shareLink
                          )}`
                        )
                      }
                      className="flex items-center gap-2 hover:text-white"
                    >
                      <FaReddit size={16} /> Reddit
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
