"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function GeneralTab() {
  // Local state (we’ll replace these with useSettings() later)
  const [theme, setTheme] = useState("Dark");
  const [language, setLanguage] = useState("English");
  const [toneInLanguage, setToneInLanguage] = useState("Friendly");
  const [interfaceDensity, setInterfaceDensity] = useState("Comfortable");
  const [defaultChatTone, setDefaultChatTone] = useState("Playful");

  const sectionStyle =
    "flex items-start justify-between py-4 border-b border-[#1E293B] last:border-none";
  const labelStyle = "text-[15px] font-medium text-gray-100";
  const descStyle = "text-sm text-gray-400 mt-1";
  const selectStyle =
    "bg-[#16213A] text-gray-100 text-sm rounded-md px-3 py-1.5 focus:ring-1 focus:ring-[#2563EB] focus:outline-none transition";

  return (
    <motion.div
      key="general-tab"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="space-y-6"
    >
      {/* Theme */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Theme</div>
          <div className={descStyle}>
            Choose between light, dark, or system theme.
          </div>
        </div>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className={selectStyle}
        >
          <option>Dark</option>
          <option>Light</option>
          <option>System</option>
        </select>
      </section>

      {/* Language */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Language</div>
          <div className={descStyle}>
            Select your preferred display language.
          </div>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={selectStyle}
        >
          <option>English</option>
          <option>Arabic</option>
          <option>French</option>
          <option>Spanish</option>
          <option>German</option>
          <option>Japanese</option>
          <option>Chinese</option>
          <option>Russian</option>
        </select>
      </section>

      {/* Tone in Language */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Tone in Language</div>
          <div className={descStyle}>
            Set Quirra’s tone when using this language.
          </div>
        </div>
        <select
          value={toneInLanguage}
          onChange={(e) => setToneInLanguage(e.target.value)}
          className={selectStyle}
        >
          <option>Friendly</option>
          <option>Professional</option>
          <option>Empathetic</option>
          <option>Formal</option>
          <option>Playful</option>
        </select>
      </section>

      {/* Interface Density */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Interface Density</div>
          <div className={descStyle}>
            Adjust spacing and layout for your comfort.
          </div>
        </div>
        <select
          value={interfaceDensity}
          onChange={(e) => setInterfaceDensity(e.target.value)}
          className={selectStyle}
        >
          <option>Compact</option>
          <option>Comfortable</option>
          <option>Expanded</option>
        </select>
      </section>

      {/* Default Chat Tone */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Default Chat Tone</div>
          <div className={descStyle}>
            Set how Quirra talks with you by default.
          </div>
        </div>
        <select
          value={defaultChatTone}
          onChange={(e) => setDefaultChatTone(e.target.value)}
          className={selectStyle}
        >
          <option>Friendly</option>
          <option>Professional</option>
          <option>Empathetic</option>
          <option>Direct</option>
          <option>Playful</option>
        </select>
      </section>
    </motion.div>
  );
}
