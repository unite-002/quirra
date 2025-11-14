"use client";
import React from "react";
import { motion } from "framer-motion";
import type { JourneyEntry } from "@/hooks/useJourneyData";

interface NodePointProps {
  x: number;
  y: number;
  entry: JourneyEntry;
  isActive?: boolean;
  onClick?: () => void;
}

export default function NodePoint({
  x,
  y,
  entry,
  isActive = false,
  onClick,
}: NodePointProps) {
  return (
    <g transform={`translate(${x}, ${y})`} style={{ cursor: "pointer" }}>
      {/* Outer glow ring */}
      <motion.circle
        r={22}
        fill="none"
        stroke="url(#glowGradient)"
        strokeWidth={3}
        animate={{
          scale: isActive ? 1.35 : 1,
          opacity: isActive ? 1 : 0.6,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onClick={onClick}
      />

      {/* Pulsating aura */}
      <motion.circle
        r={isActive ? 32 : 28}
        fill="url(#auraGradient)"
        animate={{
          opacity: isActive ? [0.4, 0.7, 0.4] : [0.1, 0.3, 0.1],
          scale: isActive ? [1, 1.1, 1] : [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        onClick={onClick}
      />

      {/* Core glowing dot */}
      <motion.circle
        r={9}
        fill="url(#coreGradient)"
        filter="url(#softGlow)"
        animate={{
          scale: isActive ? [1.1, 1.25, 1.1] : [1, 1.1, 1],
        }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        onClick={onClick}
      />

      {/* Label */}
      <foreignObject x={26} y={-25} width={200} height={60}>
        <div
          className={`text-xs ${
            isActive ? "text-[#A15EFF]" : "text-gray-300"
          } font-medium select-none`}
          style={{
            textShadow:
              isActive
                ? "0 0 8px rgba(161,94,255,0.8), 0 0 12px rgba(76,142,255,0.6)"
                : "0 0 4px rgba(120,120,255,0.3)",
          }}
        >
          {entry.title}
        </div>
      </foreignObject>

      {/* SVG Gradients and Filter definitions */}
      <defs>
        <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A15EFF" />
          <stop offset="100%" stopColor="#4C8EFF" />
        </radialGradient>

        <radialGradient id="auraGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(161,94,255,0.35)" />
          <stop offset="100%" stopColor="rgba(76,142,255,0.05)" />
        </radialGradient>

        <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4C8EFF" />
          <stop offset="100%" stopColor="#A15EFF" />
        </linearGradient>

        <filter id="softGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </g>
  );
}
