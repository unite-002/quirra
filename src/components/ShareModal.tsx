"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Share2, Linkedin, Twitter, Globe } from "lucide-react";
import clsx from "clsx";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: {
    id: string;
    messages: { id: string; role: string; content: string }[];
  };
}

export default function ShareModal({ isOpen, onClose, conversation }: ShareModalProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = slug ? `${window.location.origin}/share/${slug}` : "";

  async function handleGenerate() {
    setLoading(true);
    try {
      // ⚙️ Temporary placeholder: backend hookup next step
      await new Promise((r) => setTimeout(r, 800));
      const fakeSlug = Math.random().toString(36).substring(2, 10);
      setSlug(fakeSlug);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-2xl bg-[#0A0B1A]/90 rounded-2xl border border-gray-700/40 shadow-xl text-gray-200 p-6"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Share this conversation</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Preview */}
            <div className="bg-[#11131F]/70 border border-gray-700/30 rounded-xl p-4 mb-5 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {conversation.messages.length === 0 ? (
                <p className="text-gray-500 text-sm text-center">No messages to share yet.</p>
              ) : (
                conversation.messages.map((m) => (
                  <div
                    key={m.id}
                    className={clsx(
                      "mb-3 last:mb-0",
                      m.role === "user" ? "text-white text-right" : "text-gray-300 text-left"
                    )}
                  >
                    <div
                      className={clsx(
                        "inline-block px-3 py-2 rounded-xl max-w-[90%] text-sm leading-relaxed",
                        m.role === "user"
                          ? "bg-[rgba(25,28,46,0.92)]"
                          : "bg-transparent"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            {!slug ? (
              <div className="space-y-2">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full py-2 rounded-md text-white font-medium transition-colors disabled:opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.85) 0%, rgba(139,92,246,0.85) 100%)",
                  }}
                >
                  {loading ? "Generating link..." : "Generate link"}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Anyone with this link can view this conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center bg-[#131422]/80 rounded-md px-3 py-2 border border-gray-700/50">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="ml-2 text-gray-400 hover:text-white"
                    title="Copy link"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-center text-green-400 animate-fadeIn">
                    Link copied!
                  </p>
                )}
                <div className="flex justify-center gap-4 mt-2 text-gray-400">
                  <button className="hover:text-white" title="Share on X">
                    <Twitter size={18} />
                  </button>
                  <button className="hover:text-white" title="Share on LinkedIn">
                    <Linkedin size={18} />
                  </button>
                  <button className="hover:text-white" title="Open link">
                    <Globe size={18} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSlug(null);
                  }}
                  className="w-full py-2 rounded-md bg-gray-700/50 text-gray-200 hover:bg-gray-600/60 transition-colors"
                >
                  Revoke link
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
