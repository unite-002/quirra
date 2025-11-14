"use client";
import React, { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import type { JourneyEntry } from "@/hooks/useJourneyData";
import useJourneyData from "@/hooks/useJourneyData";

const SVG_W = 1200;
const SVG_H = 420;

/**
 * JourneyPathBig — glowing journey curve inspired by reference UI
 */
export default function JourneyPathBig({ className = "" }: { className?: string }) {
  const maybe = useJourneyData?.();
  const entries: JourneyEntry[] =
    maybe?.entries && maybe.entries.length ? maybe.entries : FALLBACK_ENTRIES;

  const [activeId, setActiveId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Smooth "journey" curve — similar shape and scale to the screenshot
  const pathD = useMemo(
    () =>
      `
      M80,320
      C280,260 420,180 560,240
      C700,300 820,160 960,180
      C1060,200 1120,120 1180,160
      `,
    []
  );

  // 4 nodes evenly spaced along the curve visually matching the reference
  const positions = useMemo(() => {
    const base = [
      { x: 140, y: 300 },
      { x: 420, y: 210 },
      { x: 720, y: 260 },
      { x: 1040, y: 180 },
    ];
    return base.map((p, i) => ({ ...p, entry: entries[i % entries.length] }));
  }, [entries]);

  return (
    <div
      className={`w-full rounded-2xl p-8 ${className}`}
      style={{
        minHeight: 480,
        background:
          "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(8,12,26,1) 45%, rgba(6,10,24,1) 100%)",
        border: "1px solid rgba(255,255,255,0.03)",
        boxShadow: "inset 0 0 80px rgba(6,10,24,0.6)",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 28, color: "rgba(255,255,255,0.95)", fontWeight: 600 }}>
          Welcome back, Tom
        </h3>
        <p style={{ margin: "6px 0 0 0", color: "rgba(180,200,230,0.22)" }}>
          Your journey continues
        </p>
      </div>

      <div style={{ position: "relative", width: "100%", height: 380 }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="neonGrad" x1="0" x2="1">
              <stop offset="0%" stopColor="#00D9FF" />
              <stop offset="50%" stopColor="#3E8BFF" />
              <stop offset="100%" stopColor="#6F5BFF" />
            </linearGradient>

            <linearGradient id="shineWhite" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </linearGradient>

            <radialGradient id="nodeCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E9FFFF" />
              <stop offset="40%" stopColor="#5FD6FF" />
              <stop offset="100%" stopColor="#3A8EFF" />
            </radialGradient>

            <radialGradient id="nodeHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(10,140,255,0.9)" />
              <stop offset="45%" stopColor="rgba(76,142,255,0.5)" />
              <stop offset="100%" stopColor="rgba(76,142,255,0.05)" />
            </radialGradient>

            <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="sg" />
              <feMerge>
                <feMergeNode in="sg" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Base faint path */}
          <path
            d={pathD}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={18}
            strokeLinecap="round"
          />

          {/* Glow band */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#neonGrad)"
            strokeWidth={20}
            strokeLinecap="round"
            opacity={0.25}
            style={{ filter: "url(#softGlow)" }}
          />

          {/* Main neon line */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#neonGrad)"
            strokeWidth={4}
            strokeLinecap="round"
            style={{ filter: "url(#softGlow)" }}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />

          {/* Subtle animated white shine */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#shineWhite)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray="6 18"
            animate={{ strokeDashoffset: [0, -60] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            style={{ mixBlendMode: "screen" }}
          />

          {/* Nodes */}
          {positions.map(({ entry, x, y }) => {
            const isActive = activeId === entry.id;
            const core = isActive ? 12 : 10;
            const halo = isActive ? 48 : 40;
            return (
              <g
                key={entry.id}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: "pointer" }}
                onClick={() => setActiveId(entry.id)}
              >
                <motion.circle
                  r={halo}
                  fill="url(#nodeHalo)"
                  opacity={isActive ? 0.6 : 0.4}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <circle r={core} fill="url(#nodeCore)" style={{ filter: "url(#softGlow)" }} />
              </g>
            );
          })}
        </svg>
      </div>

      <div
        style={{
          marginTop: 18,
          textAlign: "center",
          color: "rgba(200,220,255,0.18)",
          fontSize: 14,
        }}
      >
        Click any glowing point to revisit that moment ✨
      </div>
    </div>
  );
}

const FALLBACK_ENTRIES: JourneyEntry[] = [
  {
    id: "e1",
    title: "First breakthrough",
    content: "January 12",
    created_at: "",
    ai_reflection_snippet: "",
  } as any,
  {
    id: "e2",
    title: "Difficult week",
    content: "April 17",
    created_at: "",
    ai_reflection_snippet: "",
  } as any,
  {
    id: "e3",
    title: "New project launched",
    content: "June 25",
    created_at: "",
    ai_reflection_snippet: "",
  } as any,
  {
    id: "e4",
    title: "Milestone",
    content: "August 3",
    created_at: "",
    ai_reflection_snippet: "",
  } as any,
];
