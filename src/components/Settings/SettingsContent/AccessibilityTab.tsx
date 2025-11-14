"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";

export default function AccessibilityTab() {
  const [fontSize, setFontSize] = useState("Medium");
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [focusHighlight, setFocusHighlight] = useState(false);
  const [voiceInput, setVoiceInput] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(false);

  // Apply font size globally
  useEffect(() => {
    const size =
      fontSize === "Small" ? "14px" : fontSize === "Large" ? "18px" : "16px";
    document.documentElement.style.fontSize = size;
  }, [fontSize]);

  // High contrast mode toggle
  useEffect(() => {
    if (highContrast) document.body.classList.add("high-contrast-mode");
    else document.body.classList.remove("high-contrast-mode");
  }, [highContrast]);

  // Motion effects toggle
  useEffect(() => {
    if (reduceMotion) {
      document.documentElement.style.setProperty(
        "--motion-duration",
        "0ms"
      );
    } else {
      document.documentElement.style.setProperty(
        "--motion-duration",
        "200ms"
      );
    }
  }, [reduceMotion]);

  // Focus highlights toggle
  useEffect(() => {
    if (focusHighlight)
      document.body.classList.add("focus-highlight-mode");
    else document.body.classList.remove("focus-highlight-mode");
  }, [focusHighlight]);

  const sectionStyle =
    "flex items-start justify-between py-4 border-b border-[#1E293B] last:border-none";
  const labelStyle = "text-[15px] font-medium text-gray-100";
  const descStyle = "text-sm text-gray-400 mt-1";
  const selectStyle =
    "bg-[#16213A] text-gray-100 text-sm rounded-md px-3 py-1.5 focus:ring-1 focus:ring-[#2563EB]";

  return (
    <motion.div
      key="accessibility-tab"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="space-y-6"
    >
      {/* === Font Size === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Font Size</div>
          <div className={descStyle}>
            Adjust overall text size in the app.
          </div>
        </div>
        <select
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
          className={selectStyle}
        >
          <option>Small</option>
          <option>Medium</option>
          <option>Large</option>
        </select>
      </section>

      {/* === High Contrast === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>High Contrast</div>
          <div className={descStyle}>
            Increase contrast for better readability.
          </div>
        </div>
        <Switch
          checked={highContrast}
          onCheckedChange={setHighContrast}
          className="data-[state=checked]:bg-[#2563EB] scale-90"
        />
      </section>

      {/* === Motion Effects === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Motion Effects</div>
          <div className={descStyle}>
            Reduce animations and transitions.
          </div>
        </div>
        <Switch
          checked={reduceMotion}
          onCheckedChange={setReduceMotion}
          className="data-[state=checked]:bg-[#2563EB] scale-90"
        />
      </section>

      {/* === Focus Highlights === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Focus Highlights</div>
          <div className={descStyle}>
            Highlight focused elements for navigation.
          </div>
        </div>
        <Switch
          checked={focusHighlight}
          onCheckedChange={setFocusHighlight}
          className="data-[state=checked]:bg-[#2563EB] scale-90"
        />
      </section>

      {/* === Voice Input === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Voice Input</div>
          <div className={descStyle}>
            Enable microphone input for chatting.
          </div>
        </div>
        <Switch
          checked={voiceInput}
          onCheckedChange={setVoiceInput}
          className="data-[state=checked]:bg-[#2563EB] scale-90"
        />
      </section>

      {/* === Voice Output (TTS) === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Voice Output (TTS)</div>
          <div className={descStyle}>
            Hear Quirra’s responses read aloud.
          </div>
        </div>
        <Switch
          checked={voiceOutput}
          onCheckedChange={setVoiceOutput}
          className="data-[state=checked]:bg-[#2563EB] scale-90"
        />
      </section>
    </motion.div>
  );
}
