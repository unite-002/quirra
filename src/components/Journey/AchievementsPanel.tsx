"use client";
import React from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Target, Crown } from "lucide-react";

const achievements = [
  {
    icon: Trophy,
    title: "Milestone Master",
    desc: "Completed 12 journey goals",
    color: "#4C8EFF",
  },
  {
    icon: Star,
    title: "Consistency Streak",
    desc: "Active for 21 days in a row",
    color: "#FFD76F",
  },
  {
    icon: Target,
    title: "Focus Hero",
    desc: "Reached 95% focus this week",
    color: "#A15EFF",
  },
  {
    icon: Crown,
    title: "Top Achiever",
    desc: "Unlocked 5 major milestones",
    color: "#7D6BFF",
  },
];

export default function AchievementsPanel() {
  return (
    <motion.div
      className="relative w-full bg-gradient-to-br from-[#0B0E1C] to-[#121735] border border-gray-800 rounded-2xl p-6 shadow-[0_0_25px_rgba(161,94,255,0.15)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Header */}
      <h2 className="text-lg font-semibold text-white mb-5 tracking-wide flex items-center gap-2">
        <motion.span
          className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-[#4C8EFF] to-[#A15EFF] shadow-[0_0_10px_rgba(161,94,255,0.6)]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        Achievements
      </h2>

      {/* Achievements grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {achievements.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              className="relative bg-[#0E1328]/70 border border-gray-800/60 rounded-xl p-4 flex flex-col gap-2 overflow-hidden cursor-pointer hover:shadow-[0_0_18px_rgba(161,94,255,0.3)]"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
            >
              {/* Soft glowing aura */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  className="absolute w-24 h-24 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${item.color}22, transparent 70%)`,
                    top: "-15%",
                    left: "-10%",
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 0.3,
                  }}
                />
              </div>

              {/* Icon and Text */}
              <div className="flex items-center gap-3 z-10 relative">
                <div
                  className="p-2 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${item.color}15`,
                    border: `1px solid ${item.color}40`,
                  }}
                >
                  <Icon size={18} color={item.color} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Decorative gradient glow */}
      <div className="absolute -z-10 inset-0 bg-gradient-to-tr from-[#4C8EFF0a] to-[#A15EFF0a] blur-2xl rounded-2xl" />
    </motion.div>
  );
}
