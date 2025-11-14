"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

export default function PersonalizationTab() {
  // Local temporary state (will later connect with useSettings)
  const [chatTone, setChatTone] = useState("Friendly");
  const [customTone, setCustomTone] = useState("");
  const [chatInterface, setChatInterface] = useState("Soft Glow");
  const [backgroundAmbience, setBackgroundAmbience] = useState("Calm Deep Space");
  const [avatarExpression, setAvatarExpression] = useState("Default");
  const [emotionalAwareness, setEmotionalAwareness] = useState(true);
  const [adaptiveInterface, setAdaptiveInterface] = useState(false);
  const [ambientSoundscape, setAmbientSoundscape] = useState(false);

  const sectionStyle =
    "flex items-start justify-between py-4 border-b border-[#1E293B] last:border-none";
  const labelStyle = "text-[15px] font-medium text-gray-100";
  const descStyle = "text-sm text-gray-400 mt-1";

  return (
    <div className="space-y-6">
      {/* Chat Tone */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Default Chat Tone</div>
          <div className={descStyle}>
            Choose or describe your preferred conversation tone.
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <select
            value={chatTone}
            onChange={(e) => setChatTone(e.target.value)}
            className="bg-[#16213A] text-gray-100 text-sm rounded-md px-3 py-1.5 w-[180px] focus:ring-1 focus:ring-[#2563EB] outline-none"
          >
            <option>Friendly</option>
            <option>Professional</option>
            <option>Empathetic</option>
            <option>Playful</option>
            <option>Direct</option>
            <option>Custom...</option>
          </select>

          {chatTone === "Custom..." && (
            <input
              type="text"
              placeholder="Describe your preferred tone..."
              value={customTone}
              onChange={(e) => setCustomTone(e.target.value)}
              className="bg-[#16213A] text-gray-100 text-sm rounded-md px-3 py-1.5 w-[180px] outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
          )}
        </div>
      </section>

      {/* Chat Interface Style */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Chat Interface Style</div>
          <div className={descStyle}>
            Choose how messages and layout appear visually.
          </div>
        </div>
        <select
          value={chatInterface}
          onChange={(e) => setChatInterface(e.target.value)}
          className="bg-[#16213A] text-gray-100 text-sm rounded-md px-3 py-1.5 w-[180px] focus:ring-1 focus:ring-[#2563EB] outline-none"
        >
          <option>Soft Glow</option>
          <option>Minimal Flat</option>
          <option>Glass Morphic</option>
          <option>Compact Edge</option>
        </select>
      </section>

      {/* Background Ambience */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Background Ambience</div>
          <div className={descStyle}>
            Adjust Quirra’s environment and mood background.
          </div>
        </div>
        <select
          value={backgroundAmbience}
          onChange={(e) => setBackgroundAmbience(e.target.value)}
          className="bg-[#16213A] text-gray-100 text-sm rounded-md px-3 py-1.5 w-[180px] focus:ring-1 focus:ring-[#2563EB] outline-none"
        >
          <option>Calm Deep Space</option>
          <option>Aurora Flow</option>
          <option>Tech Blue</option>
          <option>Warm Gradient</option>
          <option>Monochrome Focus</option>
        </select>
      </section>

      {/* Avatar Expression */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Avatar Expression</div>
          <div className={descStyle}>
            Choose how Quirra visually appears when interacting.
          </div>
        </div>
        <select
          value={avatarExpression}
          onChange={(e) => setAvatarExpression(e.target.value)}
          className="bg-[#16213A] text-gray-100 text-sm rounded-md px-3 py-1.5 w-[180px] focus:ring-1 focus:ring-[#2563EB] outline-none"
        >
          <option>Default (Dynamic Orb)</option>
          <option>Minimal Dot</option>
          <option>Humanized Portrait</option>
          <option>Hidden</option>
        </select>
      </section>

      {/* Add-ons */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Optional Add-ons</div>
          <div className={descStyle}>
            Enhance your experience with interactive visual or audio effects.
          </div>
        </div>
        <div className="flex flex-col items-end gap-3 text-sm text-gray-300">
          <label className="flex items-center gap-3">
            <Switch
              checked={emotionalAwareness}
              onCheckedChange={setEmotionalAwareness}
            />
            Emotional Awareness
          </label>
          <label className="flex items-center gap-3">
            <Switch
              checked={adaptiveInterface}
              onCheckedChange={setAdaptiveInterface}
            />
            Adaptive Interface
          </label>
          <label className="flex items-center gap-3">
            <Switch
              checked={ambientSoundscape}
              onCheckedChange={setAmbientSoundscape}
            />
            Ambient Soundscape
          </label>
        </div>
      </section>
    </div>
  );
}
