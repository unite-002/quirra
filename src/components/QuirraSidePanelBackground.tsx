"use client";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

export default function QuirraSidePanelBackground({ isActive = false }: { isActive?: boolean }) {
  const controls = useAnimation();

  // 🌊 Ambient motion speed — slower when idle, faster when active
  useEffect(() => {
    if (isActive) {
      controls.start({
        backgroundPositionX: ["0%", "150%"],
        backgroundPositionY: ["0%", "120%"],
        transition: {
          duration: 16,
          ease: "easeInOut",
          repeat: Infinity,
        },
      });
    } else {
      controls.start({
        backgroundPositionX: ["0%", "100%"],
        backgroundPositionY: ["0%", "100%"],
        transition: {
          duration: 30,
          ease: "easeInOut",
          repeat: Infinity,
        },
      });
    }
  }, [isActive, controls]);

  return (
    <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
      {/* === 1. Base Layer === */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0B1A] to-[#111322]" />

      {/* === 2. Ambient Glow Layer (slightly brighter) === */}
      <motion.div
        className="absolute inset-0 mix-blend-soft-light"
        animate={{
          opacity: isActive ? [0.25, 0.35, 0.25] : 0.25,
          scale: isActive ? [1, 1.03, 1] : 1,
        }}
        transition={{
          duration: isActive ? 4 : 10,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        {/* Cyan-blue core glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[90%] h-[90%] rounded-full blur-[180px] opacity-[0.3] bg-[radial-gradient(ellipse_at_center,_#00FFFF_0%,_#0077FF_60%,_transparent_100%)]" />
        {/* Violet-pink glow */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[180px] opacity-[0.28] bg-[radial-gradient(ellipse_at_center,_#AA00FF_0%,_#6600FF_70%,_transparent_100%)]" />
      </motion.div>

      {/* === 3. Particle Layer (digital shimmer) === */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(35)].map((_, i) => {
          const size = Math.random() * 1.8 + 0.7;
          const left = Math.random() * 100;
          const top = Math.random() * 100;
          const delay = Math.random() * 5;
          const duration = 6 + Math.random() * 8;
          return (
            <motion.div
              key={i}
              className="absolute bg-white/15 rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                top: `${top}%`,
              }}
              animate={{
                opacity: [0.05, 0.4, 0.05],
                y: [0, -5, 0],
              }}
              transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* === 4. Motion Aura (slow living flow) === */}
      <motion.div
        className="absolute inset-0 opacity-[0.12]"
        animate={controls}
        style={{
          backgroundImage: `linear-gradient(125deg, rgba(0,255,255,0.18) 0%, rgba(102,0,255,0.15) 100%)`,
          backgroundSize: "200% 200%",
          filter: "blur(70px)",
          transform: "translate3d(0,0,0)",
        }}
      />

      {/* === 5. Edge Glow === */}
      <motion.div
        className="absolute right-0 top-0 w-[4px] h-full blur-[5px]"
        animate={{
          opacity: isActive ? [0.4, 0.6, 0.4] : 0.3,
        }}
        transition={{
          duration: isActive ? 3 : 8,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut",
        }}
        style={{
          background: "linear-gradient(to bottom, #00FFFF80, #0077FF55)",
          boxShadow: "0 0 20px 6px #00FFFF33",
        }}
      />

      {/* === 6. Soft Overlay === */}
      <div className="absolute inset-0 bg-[#0A0B1A]/20 backdrop-blur-[2px]" />
    </div>
  );
}
