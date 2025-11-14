"use client";
import React from "react";
import { motion } from "framer-motion";
import { Brain, Zap, Heart } from "lucide-react";

const metrics = [
  { icon: Brain, label: "Focus", value: 82, color: "#4C8EFF" },
  { icon: Heart, label: "Calmness", value: 74, color: "#A15EFF" },
  { icon: Zap, label: "Energy", value: 91, color: "#7D6BFF" },
];

export default function PerformancePanel() {
  return (
    <motion.div
      className="relative w-full bg-gradient-to-br from-[#0B0E1C] to-[#121735] border border-gray-800 rounded-2xl p-6 shadow-[0_0_25px_rgba(76,142,255,0.15)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Header */}
      <h2 className="text-lg font-semibold text-white mb-5 tracking-wide flex items-center gap-2">
        <motion.span
          className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-[#4C8EFF] to-[#A15EFF] shadow-[0_0_10px_rgba(161,94,255,0.6)]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        Mind & Performance
      </h2>

      {/* Metrics */}
      <div className="flex flex-col gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              className="relative bg-[#0E1328]/70 border border-gray-800/60 rounded-xl p-4 overflow-hidden"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              {/* Glow particles */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  className="absolute w-32 h-32 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${metric.color}22, transparent 70%)`,
                    top: "-20%",
                    left: "-10%",
                  }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>

              {/* Metric header */}
              <div className="flex justify-between items-center mb-2 relative z-10">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Icon size={16} color={metric.color} />
                  <span>{metric.label}</span>
                </div>
                <span className="text-sm text-white font-medium">
                  {metric.value}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-[#1B1F3A] rounded-full overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-full rounded-full shadow-[0_0_12px_rgba(161,94,255,0.5)]"
                  style={{
                    width: `${metric.value}%`,
                    background: `linear-gradient(90deg, ${metric.color}, #A15EFF)`,
                  }}
                  animate={{
                    width: [`${metric.value - 2}%`, `${metric.value}%`],
                    opacity: [0.9, 1, 0.9],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Soft background aura */}
      <div className="absolute -z-10 inset-0 bg-gradient-to-tr from-[#4C8EFF0a] to-[#A15EFF0a] blur-2xl rounded-2xl" />
    </motion.div>
  );
}
