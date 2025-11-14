"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";

export default function DataControlTab() {
  const [improveModel, setImproveModel] = useState(true);

  const sectionStyle =
    "flex items-center justify-between py-4 border-b border-[#1E293B] last:border-none";
  const labelStyle = "text-[15px] font-medium text-gray-100";
  const descStyle = "text-sm text-gray-400 mt-1";
  const buttonStyle =
    "px-3 py-1.5 text-sm rounded-md bg-[#16213A] hover:bg-[#1E293B] text-gray-200 transition-colors duration-150";

  return (
    <motion.div
      key="data-control"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="space-y-6"
    >
      {/* === Improve the model for everyone === */}
      <section className={sectionStyle}>
        <div className="flex flex-col">
          <div className={labelStyle}>Improve the model for everyone</div>
          <div className={descStyle}>
            Help improve QuirraAI while keeping your data private.
          </div>
        </div>
        <div className="flex items-center">
          <Switch checked={improveModel} onCheckedChange={setImproveModel} />
        </div>
      </section>

      {/* === Shared links === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Shared links</div>
          <div className={descStyle}>
            View or delete your shared chat links.
          </div>
        </div>
        <button className={buttonStyle}>Manage</button>
      </section>

      {/* === Archived chats === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Archived chats</div>
          <div className={descStyle}>
            Review or restore archived conversations.
          </div>
        </div>
        <button className={buttonStyle}>Manage</button>
      </section>

      {/* === Archive all chats === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Archive all chats</div>
          <div className={descStyle}>Move all current chats to archive.</div>
        </div>
        <button className={buttonStyle}>Archive all</button>
      </section>

      {/* === Delete all chats === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Delete all chats</div>
          <div className={descStyle}>
            Permanently remove all your chats from QuirraAI.
          </div>
        </div>
        <button className={buttonStyle}>Delete all</button>
      </section>

      {/* === Export data === */}
      <section className={sectionStyle}>
        <div>
          <div className={labelStyle}>Export data</div>
          <div className={descStyle}>Download your stored data securely.</div>
        </div>
        <button className={buttonStyle}>Export</button>
      </section>
    </motion.div>
  );
}
