"use client";

import { motion } from "framer-motion";

export default function FooterSyncBar() {
  return (
    <div className="fixed bottom-0 left-0 w-full text-center py-3 text-[#A0B3C2] text-sm bg-[#0A0B15]/70 backdrop-blur-lg border-t border-white/5">
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="inline-block w-2 h-2 bg-[#00E5FF] rounded-full mr-2"
      />
      Last synced with <span className="text-[#00E5FF]">Quirra Cloud</span> 5 minutes ago
    </div>
  );
}
