"use client";

import { motion } from "framer-motion";

export default function SummaryView() {
  return (
    <div className="flex justify-end items-center gap-3 px-6 pt-4">
      {/* View Summary Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="px-5 py-2.5 rounded-full text-sm font-medium text-white 
                   border border-white/10 bg-white/5 backdrop-blur-sm
                   hover:bg-[#1E6AFF]/20 hover:border-[#1E6AFF]/60 
                   transition-all duration-300 shadow-[0_0_12px_rgba(30,106,255,0.2)]"
      >
        View Summary
      </motion.button>

      {/* Set New Goal Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="px-5 py-2.5 rounded-full text-sm font-medium text-white 
                   border border-[#1E6AFF]/40 bg-[#1E6AFF]/10 
                   hover:bg-[#1E6AFF]/30 hover:border-[#1E6AFF]/80
                   transition-all duration-300 shadow-[0_0_16px_rgba(30,106,255,0.25)]"
      >
        Set New Goal
      </motion.button>
    </div>
  );
}
