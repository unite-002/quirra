"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { JourneyEntry } from "@/hooks/useJourneyData";
import { Sparkles, PlayCircle, X } from "lucide-react";

interface MilestoneModalProps {
  entry: JourneyEntry | null;
  onClose: () => void;
  onReplay?: (entry: JourneyEntry) => void;
}

export default function MilestoneModal({
  entry,
  onClose,
  onReplay,
}: MilestoneModalProps) {
  if (!entry) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          key="modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-[90%] max-w-xl bg-gradient-to-br from-[#0B0E1C]/95 to-[#151D3B]/95 border border-[#2A2E49] rounded-2xl shadow-[0_0_60px_rgba(108,72,255,0.3)] p-8 overflow-hidden"
        >
          {/* Soft background glow */}
          <motion.div
            className="absolute inset-0 rounded-2xl opacity-20"
            style={{
              background:
                "radial-gradient(circle at top left, #6F78FF 0%, transparent 70%)",
            }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/60 transition"
          >
            <X size={18} className="text-gray-400" />
          </button>

          {/* Header */}
          <div className="relative flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-[#4C8EFF] to-[#A15EFF] rounded-full shadow-[0_0_20px_rgba(161,94,255,0.5)]">
              <Sparkles className="text-white" size={18} />
            </div>
            <h3 className="text-xl font-semibold text-white tracking-wide">
              {entry.title}
            </h3>
          </div>

          {/* Main content */}
          <p className="relative text-gray-300 text-sm leading-relaxed">
            {entry.content}
          </p>

          {/* AI reflection */}
          <motion.blockquote
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative mt-6 text-[#A15EFF]/90 italic text-base border-l-2 border-[#A15EFF]/40 pl-3"
          >
            “{entry.ai_reflection_snippet}”
          </motion.blockquote>

          {/* Footer actions */}
          <div className="relative mt-8 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 bg-black/30 hover:bg-black/50 border border-gray-700 rounded-lg transition"
            >
              Close
            </button>

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(161,94,255,0.5)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onReplay?.(entry)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#4C8EFF] to-[#A15EFF] rounded-lg shadow-[0_0_20px_rgba(161,94,255,0.4)] transition"
            >
              <PlayCircle size={16} className="text-white" />
              Replay this moment
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
