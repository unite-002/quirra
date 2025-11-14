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
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={{
        scale: isThinking ? [1, 1.08, 1] : 1,
        rotate: isThinking ? [0, 360] : 0,
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {/* 🌠 Ambient glow (soft outer light) */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.3), rgba(56,189,248,0.15))",
        }}
        animate={{
          opacity: isThinking ? [0.4, 0.8, 0.4] : 0.3,
          scale: isThinking ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 💫 Orbiting light ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-blue-400/20"
        animate={{
          rotate: isThinking ? 360 : 0,
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <div className="absolute top-0 left-1/2 w-[6px] h-[6px] rounded-full bg-blue-400 shadow-[0_0_10px_rgba(56,189,248,0.7)]" />
      </motion.div>

      {/* 🌌 Core pulse */}
      <motion.div
        className="absolute inset-[25%] rounded-full bg-gradient-to-br from-blue-300 via-indigo-400 to-sky-500 shadow-[0_0_30px_rgba(99,102,241,0.6)]"
        animate={{
          scale: isThinking ? [1, 1.15, 1] : 1,
          opacity: isThinking ? [0.8, 1, 0.8] : 0.9,
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 🌈 Dynamic gradient shimmer */}
      <motion.div
        className="absolute inset-[30%] rounded-full mix-blend-screen blur-sm"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(147,197,253,0.8), rgba(167,139,250,0.8), rgba(56,189,248,0.8), rgba(147,197,253,0.8))",
        }}
        animate={{
          rotate: isThinking ? [0, 360] : 0,
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
};
