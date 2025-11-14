"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";

export default function NotificationTab() {
  // state
  const [desktopEnabled, setDesktopEnabled] = useState(true);
  const [desktopType, setDesktopType] = useState("Banner");

  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState("Morning (9 AM)");
  const [dailyMethod, setDailyMethod] = useState("Email");

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailFreq, setEmailFreq] = useState("Weekly");

  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndDuration, setDndDuration] = useState("1 hour");
  const [dndScope, setDndScope] = useState("Chat Only");

  // styles
  const sectionStyle =
    "py-4 border-b border-[#1E293B] last:border-none";
  const labelStyle = "text-[15px] font-medium text-gray-100";
  const descStyle = "text-sm text-gray-400 mt-1";
  const selectStyle =
    "bg-[#16213A] text-gray-100 text-sm rounded-md px-3 py-1.5 focus:ring-1 focus:ring-[#2563EB] focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed";
  const rowGrid = "grid grid-cols-[1fr_auto] gap-4 items-start";

  return (
    <motion.div
      key="notification-tab"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="space-y-6"
    >
      {/* Desktop Notifications */}
      <section className={sectionStyle}>
        <div className={rowGrid}>
          <div>
            <div className={labelStyle}>Desktop Notifications</div>
            <div className={descStyle}>Show alerts for new messages and updates.</div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={desktopEnabled}
              onCheckedChange={(v) => setDesktopEnabled(Boolean(v))}
              aria-label="Enable desktop notifications"
            />
            <select
              value={desktopType}
              onChange={(e) => setDesktopType(e.target.value)}
              disabled={!desktopEnabled}
              className={selectStyle}
              aria-label="Desktop notification type"
              title="Desktop notification type"
            >
              <option>Banner</option>
              <option>Modal</option>
              <option>Silent</option>
            </select>
          </div>
        </div>
      </section>

      {/* Daily Reminder */}
      <section className={sectionStyle}>
        <div className={rowGrid}>
          <div>
            <div className={labelStyle}>Daily Reminder</div>
            <div className={descStyle}>Receive a daily check-in from Quirra.</div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={dailyEnabled}
              onCheckedChange={(v) => setDailyEnabled(Boolean(v))}
              aria-label="Enable daily reminder"
            />

            <select
              value={dailyTime}
              onChange={(e) => setDailyTime(e.target.value)}
              disabled={!dailyEnabled}
              className={selectStyle}
              aria-label="Daily reminder time"
              title="Daily reminder time"
            >
              <option>Morning (9 AM)</option>
              <option>Afternoon (1 PM)</option>
              <option>Evening (7 PM)</option>
              <option>Custom…</option>
            </select>

            <select
              value={dailyMethod}
              onChange={(e) => setDailyMethod(e.target.value)}
              disabled={!dailyEnabled}
              className={selectStyle}
              aria-label="Daily reminder method"
              title="Daily reminder method"
            >
              <option>Email</option>
              <option>Chat Message</option>
              <option>Pop-up</option>
            </select>
          </div>
        </div>
      </section>

      {/* Email Updates */}
      <section className={sectionStyle}>
        <div className={rowGrid}>
          <div>
            <div className={labelStyle}>Email Updates</div>
            <div className={descStyle}>Get summaries and insights from Quirra.</div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={emailEnabled}
              onCheckedChange={(v) => setEmailEnabled(Boolean(v))}
              aria-label="Enable email updates"
            />
            <select
              value={emailFreq}
              onChange={(e) => setEmailFreq(e.target.value)}
              disabled={!emailEnabled}
              className={selectStyle}
              aria-label="Email updates frequency"
              title="Email updates frequency"
            >
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Never</option>
            </select>
          </div>
        </div>
      </section>

      {/* Do Not Disturb */}
      <section className={sectionStyle}>
        <div className={rowGrid}>
          <div>
            <div className={labelStyle}>Do Not Disturb</div>
            <div className={descStyle}>Mute all alerts temporarily.</div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={dndEnabled}
              onCheckedChange={(v) => setDndEnabled(Boolean(v))}
              aria-label="Enable Do Not Disturb"
            />

            <select
              value={dndDuration}
              onChange={(e) => setDndDuration(e.target.value)}
              disabled={!dndEnabled}
              className={selectStyle}
              aria-label="Do Not Disturb duration"
              title="Do Not Disturb duration"
            >
              <option>1 hour</option>
              <option>Until tomorrow</option>
              <option>Custom…</option>
            </select>

            <select
              value={dndScope}
              onChange={(e) => setDndScope(e.target.value)}
              disabled={!dndEnabled}
              className={selectStyle}
              aria-label="Do Not Disturb scope"
              title="Do Not Disturb scope"
            >
              <option>All Notifications</option>
              <option>Chat Only</option>
              <option>System Only</option>
            </select>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
