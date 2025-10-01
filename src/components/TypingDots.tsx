"use client";

import { useState } from "react";
import ChatInput from "@/components/ChatInput";

interface LibraryViewProps {
  onClose: () => void;
  chatSessions: { id: string; title: string }[];
  handleSwitchChatSession: (id: string) => void;
}

export default function LibraryView({
  onClose,
  chatSessions,
  handleSwitchChatSession,
}: LibraryViewProps) {
  // state for the input
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // handle send
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);

    // ⚡️ Placeholder: here’s where you’d handle sending
    console.log("Library message:", input);

    // reset input
    setTimeout(() => {
      setInput("");
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#1a213a]">
        <h2 className="text-lg font-semibold text-white">Library</h2>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200"
        >
          Close
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {chatSessions.length === 0 ? (
          <p className="text-gray-400 text-sm">No saved chats yet.</p>
        ) : (
          chatSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSwitchChatSession(s.id)}
              className="block w-full text-left p-3 rounded-lg bg-[#2a304e] text-gray-200 hover:bg-[#39406a] transition"
            >
              {s.title || "Untitled chat"}
            </button>
          ))
        )}
      </div>

      {/* ChatGPT-like input area at the bottom */}
      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        isRegenerating={isRegenerating}
        isChatEmpty={chatSessions.length === 0}
        handleSubmit={handleSubmit}
        // (optional) wire these up later if you want
        onFileSelect={(files) => console.log("Files:", files)}
        onPhotoSelect={(files) => console.log("Photos:", files)}
        onSetDailyFocus={() => console.log("Set Daily Focus")}
        onSetGoal={() => console.log("Set Goal")}
        onLogMood={() => console.log("Log Mood")}
      />
    </div>
  );
}
