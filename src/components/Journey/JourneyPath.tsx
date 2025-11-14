// src/components/Journey/JourneyPathBig.tsx
"use client";
import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { JourneyEntry } from "@/hooks/useJourneyData";
import useJourneyData from "@/hooks/useJourneyData";

const SVG_W = 1040;
const SVG_H = 520;

/**
 * JourneyPathBig — neon journey curve (photo-like)
 * - 70% width, slightly left-shifted (keeps your chosen layout)
 * - layered glow, shimmer, and four pulsing nodes
 */
export default function JourneyPathBig({ className = "" }: { className?: string }) {
  const maybe = useJourneyData?.();
  const entries: JourneyEntry[] =
    maybe?.entries && maybe.entries.length ? maybe.entries : FALLBACK_ENTRIES;

  const [activeId, setActiveId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // A smooth S-curve similar to the reference image.
  // Starts low-left, gentle long horizontal run, then an S-loop in the center,
  // and finishes higher at the right.
  const pathD = useMemo(
    () =>
      `
      M-30,430
      C160,390 360,300 560,320
      C700,340 820,220 1020,140
      `,
    []
  );

  // Node positions chosen to follow the curve and match the visual rhythm in the photo.
  const positions = useMemo(() => {
    const base = [
      { x: 60, y: 428 },   // far left node (start)
      { x: 360, y: 320 },  // lower-mid (just before S)
      { x: 600, y: 260 },  // center S bump
      { x: 900, y: 140 },  // top-right node (end)
    ];
    return base.map((p, i) => ({ ...p, entry: entries[i % entries.length] }));
  }, [entries]);

  return (
    <div
      className={`rounded-2xl p-8 ${className}`}
      style={{
        width: "70%",
        minHeight: 580,
        background: "linear-gradient(180deg, #0A0F24 0%, #0B1125 100%)", // your requested dark navy
        border: "1px solid rgba(255,255,255,0.035)",
        boxShadow: "inset 0 0 80px rgba(11,17,37,0.6)",
        marginLeft: "-30px", // keeps the left-hug you wanted
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

      <div style={{ position: "relative", width: "100%", height: 480 }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* neon gradient for the ribbon */}
            <linearGradient id="neonGrad" x1="0" x2="1">
              <stop offset="0%" stopColor="#07BFFF" />
              <stop offset="45%" stopColor="#2FA6FF" />
              <stop offset="85%" stopColor="#4F6EFF" />
              <stop offset="100%" stopColor="#6B4CFF" />
            </linearGradient>

            {/* thin white shine gradient */}
            <linearGradient id="shineWhite" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
            </linearGradient>

            {/* node inner core + halo */}
            <radialGradient id="nodeCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E9FFFF" />
              <stop offset="30%" stopColor="#7FD8FF" />
              <stop offset="100%" stopColor="#3A8EFF" />
            </radialGradient>

            <radialGradient id="nodeHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(64,160,255,0.95)" />
              <stop offset="50%" stopColor="rgba(64,160,255,0.45)" />
              <stop offset="100%" stopColor="rgba(64,160,255,0.02)" />
            </radialGradient>

            {/* big blurred glow for the ribbon */}
            <filter id="bigGlow" x="-250%" y="-250%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="20" result="b1" />
              <feGaussianBlur stdDeviation="8" result="b2" />
              <feMerge>
                <feMergeNode in="b1" />
                <feMergeNode in="b2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* smaller soft glow for nodes and ribbon */}
            <filter id="softGlow" x="-150%" y="-150%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="sg" />
              <feMerge>
                <feMergeNode in="sg" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* small sparkle radial for node highlight */}
            <radialGradient id="sparkGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="35%" stopColor="#76D5FF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#76D5FF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Structural faint baseline for weight */}
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={20} strokeLinecap="round" />

          {/* wide glow band */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#neonGrad)"
            strokeWidth={30}
            strokeLinecap="round"
            opacity={0.16}
            style={{ filter: "url(#bigGlow)" }}
          />

          {/* main neon ribbon */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#neonGrad)"
            strokeWidth={6}
            strokeLinecap="round"
            style={{ filter: "url(#softGlow)" }}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

          {/* thin moving white sheen to give motion */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#shineWhite)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="8 22"
            animate={{ strokeDashoffset: [0, -120] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
            style={{ mixBlendMode: "screen" }}
          />

          {/* small traveling sparkle (fades in/out along path by offset animation) */}
          <motion.circle
            r={6}
            fill="url(#sparkGrad)"
            style={{ filter: "url(#softGlow)" }}
            animate={{ opacity: [0, 1, 0], transform: ["translateX(0px)", "translateX(0px)"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
            // place initially off-canvas; it's decorative and pulses
            cx={-40}
            cy={-40}
          />

          {/* Nodes (halo + core + crisp white ring) */}
          {positions.map(({ entry, x, y }, i) => {
            const isActive = activeId === entry.id;
            const outer = isActive ? 78 : 56;
            const mid = isActive ? 42 : 32;
            const core = isActive ? 14 : 10;
            return (
              <g
                key={`${entry.id}-${i}`}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: "pointer" }}
                onClick={() => setActiveId(entry.id)}
              >
                {/* outer halo */}
                <motion.circle
                  r={outer}
                  fill="url(#nodeHalo)"
                  opacity={isActive ? 0.6 : 0.32}
                  animate={{
                    scale: isActive ? [1, 1.06, 1] : [1, 1.02, 1],
                    opacity: isActive ? [0.6, 0.86, 0.6] : [0.32, 0.44, 0.32],
                  }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* mid glow */}
                <motion.circle
                  r={mid}
                  fill="url(#nodeHalo)"
                  opacity={isActive ? 0.98 : 0.7}
                  animate={{ scale: isActive ? [1, 1.05, 1] : [1, 1.03, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* core */}
                <motion.circle
                  r={core}
                  fill="url(#nodeCore)"
                  style={{ filter: "url(#softGlow)" }}
                  animate={{ scale: isActive ? [1, 1.18, 1] : [1, 1.08, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* crisp white ring */}
                <circle r={core + 4} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** Fallback demo entries */
const FALLBACK_ENTRIES: JourneyEntry[] = [
  { id: "e1", title: "First breakthrough", content: "January 12", created_at: "", ai_reflection_snippet: "" } as any,
  { id: "e2", title: "Difficult week", content: "April 17", created_at: "", ai_reflection_snippet: "" } as any,
  { id: "e3", title: "New project launched", content: "June 25", created_at: "", ai_reflection_snippet: "" } as any,
  { id: "e4", title: "Milestone", content: "August 3", created_at: "", ai_reflection_snippet: "" } as any,
];
