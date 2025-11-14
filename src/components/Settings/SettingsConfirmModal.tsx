"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import React, { useEffect } from "react";

type SettingsConfirmModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export default function SettingsConfirmModal({
  open,
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: SettingsConfirmModalProps) {
  // Close modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-backdrop"
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            key="confirm-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[#0B1125]/95 border border-[#1E293B] rounded-2xl w-full max-w-md p-6 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[#16213A] transition-colors"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>

            {/* Title */}
            <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>

            {/* Message */}
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">{message}</p>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-md text-sm bg-[#16213A] hover:bg-[#1E293B] text-gray-300 transition-all"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm?.();
                  onCancel?.();
                }}
                className="px-4 py-2 rounded-md text-sm font-medium bg-[#1E293B] hover:bg-[#22304A] text-gray-100 transition-all"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
