"use client";
import { motion } from "framer-motion";
import React from "react";

interface ThinkingOrbProps {
  isThinking: boolean;
  size?: number; // allows optional custom size
}

export const ThinkingOrb: React.FC<ThinkingOrbProps> = ({ isThinking, size = 36 }) => {
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={{
        scale: isThinking ? [1, 1.06, 1] : 1,
        opacity: isThinking ? [0.9, 1, 0.9] : 1,
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full blur-xl bg-gradient-to-r from-blue-400/30 via-indigo-500/30 to-sky-400/30 animate-pulse" />

      {/* Inner core */}
      <motion.div
        className="absolute inset-[20%] rounded-full bg-gradient-to-br from-blue-300/80 via-sky-300/70 to-indigo-400/60 shadow-[0_0_20px_rgba(56,189,248,0.5)]"
        animate={{
          background: isThinking
            ? [
                "radial-gradient(circle at 30% 30%, rgba(96,165,250,0.9), rgba(37,99,235,0.5), rgba(17,24,39,0.1))",
                "radial-gradient(circle at 70% 70%, rgba(125,211,252,0.9), rgba(56,189,248,0.6), rgba(17,24,39,0.1))",
              ]
            : [
                "radial-gradient(circle at 50% 50%, rgba(96,165,250,0.8), rgba(17,24,39,0.2))",
              ],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
};
