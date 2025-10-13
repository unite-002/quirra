"use client";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

type Props = {
  isActive?: boolean;         // overall "thinking" state (slower ongoing reaction)
  pulse?: number;             // integer counter: increment on each incoming stream chunk to trigger ripple
  emotion?: number | null;    // optional [-1..1] or [0..1] indicator for future color shifts
};

export default function QuirraBackground({ isActive = false, pulse = 0, emotion = null }: Props) {
  const flowControls = useAnimation();
  const pulseControls = useAnimation();
  const subtleControls = useAnimation();

  // Flow speed: idle vs active
  useEffect(() => {
    const idleDuration = 20;   // full cycle when idle (s)
    const activeDuration = 12; // faster when active (s)

    flowControls.start({
      backgroundPosition: isActive ? ["0% 0%", "200% 200%"] : ["0% 0%", "100% 100%"],
      transition: {
        duration: isActive ? activeDuration : idleDuration,
        ease: "easeInOut",
        repeat: Infinity,
      },
    });

    subtleControls.start({
      opacity: isActive ? 0.18 : 0.08,
      transition: { duration: isActive ? 1.8 : 8, ease: "easeInOut" },
    });
  }, [isActive, flowControls, subtleControls]);

  // Pulse ripple when 'pulse' increments
  useEffect(() => {
    if (pulse === 0) return; // ignore initial
    // short ripple: scale up & fade
    pulseControls.start({
      scale: [1, 1.12, 1.02],
      opacity: [0.0, 0.28, 0.0],
      transition: { duration: 0.9, ease: "easeOut" },
    });
  }, [pulse, pulseControls]);

  // Emotion-based hue subtle shift (small, non-distracting)
  useEffect(() => {
    if (emotion == null) {
      // reset
      subtleControls.start({ filter: "saturate(1) hue-rotate(0deg)" });
    } else {
      // map emotion to hue shift [-20deg..20deg]
      const v = Math.max(-1, Math.min(1, emotion));
      const deg = Math.round(v * 18);
      subtleControls.start({ filter: `saturate(1.05) hue-rotate(${deg}deg)`, transition: { duration: 1.6 }});
    }
  }, [emotion, subtleControls]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base + gradient */}
      <div className="absolute inset-0 bg-[#05060F]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0B1A] to-[#0F172A]" />

      {/* Ambient glow blobs */}
      <div className="absolute top-[-22%] left-[-12%] w-[62vw] h-[62vh] rounded-full blur-[180px]" style={{ background: "rgba(63,81,181,0.10)" }} />
      <div className="absolute bottom-[-12%] right-[-12%] w-[50vw] h-[50vh] rounded-full blur-[160px]" style={{ background: "rgba(142,45,226,0.10)" }} />

      {/* === Living Mind: slow flowing layered gradients (flowControls) === */}
      <motion.div
        className="absolute inset-0 mix-blend-screen"
        animate={flowControls}
        style={{
          backgroundImage: [
            // multiple soft layers for depth
            "radial-gradient(ellipse at 20% 40%, rgba(59,130,246,0.22) 0%, transparent 36%)",
            "radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.18) 0%, transparent 48%)",
            "linear-gradient(125deg, rgba(0,212,255,0.05) 0%, rgba(142,45,226,0.05) 100%)",
          ].join(","),
          backgroundSize: "200% 200%",
          filter: "blur(40px)",
          opacity: 0.12,
        }}
      />

      {/* subtle layer we modulate opacity / hue on */}
      <motion.div
        className="absolute inset-0"
        animate={subtleControls}
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(0,212,255,0.02), transparent 30%), radial-gradient(circle at 20% 70%, rgba(142,45,226,0.02), transparent 40%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* === Pulse ripple (triggered on streaming chunks) === */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={pulseControls}
        initial={{ opacity: 0, scale: 1 }}
        style={{
          background: "radial-gradient(circle at center, rgba(142,45,226,0.22), transparent 35%)",
          filter: "blur(58px)",
        }}
      />

      {/* Soft reactive center glow (persistent when active) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: isActive ? 0.28 : 0.08, scale: isActive ? 1.01 : 1 }}
        transition={{ duration: isActive ? 1.6 : 8, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle at 52% 48%, rgba(0,212,255,0.10), transparent 55%)",
          filter: "blur(60px)",
        }}
      />

      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
    </div>
  );
}
