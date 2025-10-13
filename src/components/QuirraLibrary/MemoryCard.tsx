"use client";

import { motion } from "framer-motion";

export default function MemoryCard({ item }: { item: any }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="group relative bg-[rgba(18,20,38,0.85)] border border-cyan-400/10 rounded-2xl p-4 shadow-[0_6px_18px_rgba(0,255,255,0.08)] hover:shadow-[0_6px_18px_rgba(0,255,255,0.25)] cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.4),transparent_60%)] transition-opacity" />
      <div className="relative flex flex-col justify-between h-full">
        <div className="text-2xl">📄</div>
        <div className="mt-3 text-[15px] font-semibold text-[#E6F1FF]">
          {item.title}
        </div>
        <div className="mt-2 text-xs text-[#9BA9B9]">
          <span className="px-2 py-0.5 rounded-full bg-[rgba(0,229,255,0.12)] text-[#00E5FF]">
            {item.tag}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
