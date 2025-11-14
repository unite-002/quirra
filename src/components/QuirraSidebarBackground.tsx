"use client";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import QuirraLogo from "@/components/QuirraLogo";


export default function QuirraSidebarBackground({ isActive = true }: { isActive?: boolean }) {
  const controls = useAnimation();

  useEffect(() => {
    if (isActive) {
      controls.start({
        opacity: [0.25, 0.4, 0.25],
        transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
      });
    } else {
      controls.start({ opacity: 0.2 });
    }
  }, [isActive, controls]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-2xl">
      {/* === 1. Deep Matte Gradient Base === */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0B16] via-[#0A0C19] to-[#0B0C1A]" />

      {/* === 2. Subtle Edge Rim Light (right side) === */}
      <motion.div
        animate={controls}
        className="absolute top-0 right-0 h-full w-[3px] blur-[5px]"
        style={{
          background: "linear-gradient(to left, rgba(0,120,255,0.5), rgba(0,120,255,0.1), transparent)",
        }}
      />

      {/* === 3. Internal Glow Strip (soft blue fade inward) === */}
      <motion.div
        animate={controls}
        className="absolute inset-y-0 right-[8%] w-[40%] blur-[100px]"
        style={{
          background: "linear-gradient(to left, rgba(0,90,255,0.25), transparent)",
          mixBlendMode: "screen",
        }}
      />

      {/* === 4. Top Logo Glow Circle === */}
      <motion.div
        animate={controls}
        className="absolute top-6 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(60,120,255,0.8) 0%, rgba(40,80,200,0.15) 70%, transparent 100%)",
          filter: "blur(2px)",
        }}
      />

      {/* === 5. Soft Glass Overlay === */}
      <div className="absolute inset-0 bg-[#0A0C18]/30 backdrop-blur-[2px] border border-[#1A1F2C]/40 rounded-2xl shadow-[0_0_25px_rgba(0,80,255,0.1)]" />
    </div>
  );
}  
