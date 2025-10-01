import React, { useEffect, useMemo, useState } from "react";

type Props = {
  /** Whether Quirra is thinking. Controls visibility. */
  isThinking: boolean;
  /**
   * Optional progress 0..1 (e.g. backend estimate of readiness).
   * If omitted, the component uses an elegant indeterminate animation.
   */
  progress?: number | null;
  /** Optional short override label (keeps safe defaults if omitted). */
  statusLabel?: string;
  className?: string;
};

const SAFE_LABELS = [
  "Gathering the best facts",
  "Weighing the best options",
  "Composing a careful answer",
  "Checking for clarity and accuracy",
  "Polishing the final response",
];

export default function QuirraDeepThought({
  isThinking,
  progress = null,
  statusLabel,
  className = "",
}: Props) {
  const [tick, setTick] = useState(0);

  // cycle a calm label so the UI feels alive without exposing reasoning
  const label = useMemo(() => statusLabel ?? SAFE_LABELS[tick % SAFE_LABELS.length], [statusLabel, tick]);

  useEffect(() => {
    if (!isThinking) {
      setTick(0);
      return;
    }
    const id = window.setInterval(() => setTick((t) => t + 1), 3800); // gentle rotation
    return () => clearInterval(id);
  }, [isThinking]);

  // computed visual progress for ring (0..1). If no backend progress, animate between 0.18 and 0.78 so user sees growth.
  const visualProgress = useMemo(() => {
    if (typeof progress === "number") {
      // clamp
      return Math.max(0, Math.min(1, progress));
    }
    // indeterminate gentle oscillation (so user still sees progress-like motion)
    return 0.18 + 0.58 * (0.5 + 0.5 * Math.sin((Date.now() / 1400) % (Math.PI * 2)));
  }, [progress, tick]); // tick to force updates for indeterminate

  // ring stroke-dashoffset calc (SVG circumference approach)
  const R = 28;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - visualProgress);

  if (!isThinking) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`quirra-deep-thought flex items-center gap-3 p-2 ${className}`}
    >
      {/* Visual: nebula core with ring */}
      <div className="relative w-14 h-14 flex-shrink-0" aria-hidden>
        <svg viewBox="0 0 80 80" className="w-full h-full">
          {/* soft nebula blob (behind) */}
          <defs>
            <radialGradient id="qg" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#dbe9ff" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#9fbfff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#3c5fa8" stopOpacity="0.08" />
            </radialGradient>
            <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          <g transform="translate(40,40)">
            <g transform="translate(-40,-40)">
              <ellipse cx="40" cy="36" rx="22" ry="22" fill="url(#qg)" filter="url(#blur)" />
            </g>

            {/* main core */}
            <circle cx="0" cy="-2" r="8" className="quirra-core" />

            {/* micro-pulse particles (purely visual) */}
            <g className="particles" opacity="0.95">
              <circle cx="22" cy="-6" r="1.4" className="p" />
              <circle cx="-18" cy="8" r="1.1" className="p" />
              <circle cx="-6" cy="-18" r="1.2" className="p" />
            </g>

            {/* progress ring */}
            <g transform="translate(-0,0)">
              <circle
                cx="0"
                cy="0"
                r={R}
                stroke="rgba(140,170,255,0.12)"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="0"
                cy="0"
                r={R}
                stroke="url(#progressGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={C.toFixed(2)}
                strokeDashoffset={offset.toFixed(2)}
                style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.2,.9,.2,1)" }}
              />
            </g>

            <defs>
              <linearGradient id="progressGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#9be2ff" />
                <stop offset="50%" stopColor="#70b8ff" />
                <stop offset="100%" stopColor="#6e8cff" />
              </linearGradient>
            </defs>
          </g>
        </svg>
      </div>

      {/* Text + subtle waveform */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium leading-tight text-[#d9ecff] truncate">{label}</div>
            <div className="text-xs text-[#b9d8ff] truncate mt-[2px]">Quirra is composing a careful answer</div>
          </div>

          {/* confidence badge (friendly, not exact) */}
          <div
            className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
            aria-hidden
            title={typeof progress === "number" ? `Confidence ~ ${(visualProgress * 100).toFixed(0)}%` : "Analyzing"}
          >
            <span className="inline-block w-2 h-2 mr-1 align-middle rounded-full bg-gradient-to-r from-[#a7e0ff] to-[#7ea7ff] shadow-sm" />
            <span className="text-[#dbefff]">{typeof progress === "number" ? `${Math.round(visualProgress*100)}%` : "…"}</span>
          </div>
        </div>

        {/* gentle waveform under the text */}
        <div className="mt-2 h-3 overflow-hidden" aria-hidden>
          <svg viewBox="0 0 120 12" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0 6 C 20 2, 40 10, 60 6 C 80 2, 100 10, 120 6"
              className="wave"
              strokeWidth="1.6"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <span className="sr-only">Quirra is thinking</span>

      <style jsx>{`
        .quirra-deep-thought { color: #cfe8ff; }

        /* core */
        .quirra-core {
          fill: #e9f4ff;
          filter: drop-shadow(0 6px 14px rgba(30,50,120,0.18));
          transform-origin: 40px 40px;
          animation: core-pulse 1.7s ease-in-out infinite;
        }

        @keyframes core-pulse {
          0% { transform: translateY(0px) scale(1); opacity: 1; }
          50% { transform: translateY(-1.5px) scale(1.06); opacity: 0.96; }
          100% { transform: translateY(0px) scale(1); opacity: 1; }
        }

        /* particles */
        .particles .p { fill: rgba(180,200,255,0.95); animation: particle-float 2.4s ease-in-out infinite; transform-origin: 40px 40px; }
        .particles .p:nth-child(1) { animation-delay: -0.4s; }
        .particles .p:nth-child(2) { animation-delay: -0.9s; }
        .particles .p:nth-child(3) { animation-delay: -1.1s; }

        @keyframes particle-float {
          0% { transform: translateY(0) scale(1); opacity: 0.95; }
          50% { transform: translateY(-2px) scale(1.06); opacity: 0.8; }
          100% { transform: translateY(0) scale(1); opacity: 0.95; }
        }

        /* waveform */
        .wave { stroke: rgba(170,200,255,0.95); stroke-dasharray: 46; stroke-dashoffset: 0; animation: wave-move 1400ms ease-in-out infinite; opacity: 0.95; }
        @keyframes wave-move {
          0% { transform: translateX(-6px); opacity: 0.65; stroke-dashoffset: 46; }
          50% { transform: translateX(2px); opacity: 1; stroke-dashoffset: 0; }
          100% { transform: translateX(-6px); opacity: 0.65; stroke-dashoffset: -46; }
        }

        /* prefers reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .quirra-core,
          .particles .p,
          .wave {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
