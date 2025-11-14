"use client";

import { motion } from "framer-motion";

export default function AboutTab() {
  const sectionStyle =
    "py-4 border-b border-[#1E293B] last:border-none";
  const titleStyle = "text-[15px] font-medium text-gray-100 mb-1";
  const textStyle = "text-sm text-gray-300 leading-relaxed";
  const linkStyle =
    "text-sm text-[#60A5FA] hover:underline cursor-pointer transition-colors";

  return (
    <motion.div
      key="about-tab"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="space-y-6"
    >
      {/* === About QuirraAI === */}
      <section className={sectionStyle}>
        <div className={titleStyle}>Quirra</div>
        <p className={textStyle}>
         Your deeply personal, emotionally intelligent AI — built to mentor, support, and evolve with you. Private, ethical, and designed for lifelong growth.
        </p>
      </section>

      {/* === Version Info === */}
      <section className={sectionStyle}>
        <div className={titleStyle}>Version Info</div>
        <p className={textStyle}>Version 1.0.0 — Beta</p>
      </section>

      {/* === Developed By === */}
      <section className={sectionStyle}>
        <div className={titleStyle}>Developed By</div>
        <p className={textStyle}>QuirraAI Team</p>
      </section>

      {/* === Useful Links === */}
      <section className={sectionStyle}>
        <div className={titleStyle}>Useful Links</div>
        <ul className="space-y-1 mt-1">
          <li className={linkStyle}>Privacy Policy</li>
          <li className={linkStyle}>Terms of Service</li>
          <li className={linkStyle}>Support Center</li>
        </ul>
      </section>

      {/* === Footer === */}
      <section className="pt-4">
        <p className="text-xs text-gray-500 text-center">
          © 2025 QuirraAI. All rights reserved.
        </p>
      </section>
    </motion.div>
  );
}
