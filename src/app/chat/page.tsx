// src/app/chat/page.tsx (UPDATED - Profile button removed from sidebar)
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import {
  MenuIcon, // Hamburger icon for opening/closing sidebar
  Settings,
  User, // Keep User icon if you use it elsewhere, otherwise remove
  MessageSquarePlus,
  Copy,
  Send,
  Loader2, // Keep Loader2 for other loading states if needed, or remove if not
  LogOut,
  Check, // New icon for 'copied' feedback
  RotateCcw,
} from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null); // State for copy feedback
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ✅ Redirect if not logged in and load history
  useEffect(() => {
    const checkAuthAndLoadHistory = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        router.push("/login"); // or "/sign-in" depending on your route
        return;
      }

      // Set user email if session exists
      if (session.user?.email) {
        setUserEmail(session.user.email);
      }

      // Load history only if user is authenticated
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error("❌ Failed to load history:", fetchError.message);
      } else {
        const chatData = data.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));
        setMessages(chatData);
        if (chatData.length > 0) {
          setShowWelcomeMessage(false);
        }
      }
    };

    checkAuthAndLoadHistory();
  }, [router]);

  // 🔽 Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setShowWelcomeMessage(false);
    setIsLoading(true);

    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Add a temporary "typing" message for the assistant
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.content }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.response },
      ]);

      await supabase.from("messages").insert([
        { role: userMessage.role, content: userMessage.content },
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      console.error("❌ Chat error:", err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "⚠️ Failed to connect to Quirra's brain. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (isLoading) return;
    setMessages([]);
    setShowWelcomeMessage(true);
    setIsSidebarOpen(false); // Close sidebar after reset
    try {
      await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      console.log("Conversation history reset on server.");
    } catch (err) {
      console.error("❌ Failed to reset conversation on server:", err);
    }
  };

  const handleNewChat = () => {
    if (isLoading) return;
    setMessages([]);
    setShowWelcomeMessage(true);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    router.push("/sign-out");
  };

  const copyToClipboard = async (text: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("📋 Copy failed", err);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-[#0A0B1A] border-r border-[#1a213a] z-50 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out flex flex-col`}
      >
        <div className="p-4 flex items-center justify-start border-b border-[#1a213a]">
          {/* MenuIcon here now toggles sidebar */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-[#1a213a] mr-3"
            aria-label="Toggle sidebar"
          >
            <MenuIcon size={24} />
          </button>
          <h2 className="text-2xl font-bold text-white">Quirra</h2>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-left text-gray-300 hover:bg-[#1a213a] hover:text-white transition-colors text-lg"
          >
            <MessageSquarePlus size={20} /> New Chat
          </button>
          {/* Placeholder for recent chats - will be functional later */}
          <div className="mt-4 text-gray-400 text-sm px-4">Recent</div>
          {/* Example of a recent chat item (static for now) */}
          <button
            disabled
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-left text-gray-500 cursor-not-allowed text-base"
          >
            <MessageSquarePlus size={20} /> Old Chat Title (soon)
          </button>
        </nav>
        <div className="p-4 border-t border-[#1a213a] flex flex-col gap-2">
          {/* User Profile Section */}
          {userEmail && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#1a213a] border border-[#2a304e]">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
                {userEmail[0]?.toUpperCase()}
              </div>
              <span className="text-gray-200 text-base overflow-hidden text-ellipsis whitespace-nowrap">
                {userEmail}
              </span>
            </div>
          )}

          {/* Profile button removed */}
          {/*
          <button
            onClick={() => {
              router.push("/profile");
              setIsSidebarOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-left text-gray-300 hover:bg-[#1a213a] hover:text-white transition-colors text-lg"
          >
            <User size={20} /> Profile
          </button>
          */}

          <button
            onClick={() => {
              router.push("/settings");
              setIsSidebarOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-left text-gray-300 hover:bg-[#1a213a] hover:text-white transition-colors text-lg"
          >
            <Settings size={20} /> Settings
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-left text-red-400 hover:bg-red-700 hover:text-white transition-colors text-lg mt-2"
          >
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <header className="p-4 flex items-center gap-4 border-b border-[#1a213a] bg-[#0A0B1A] shadow-lg">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)} // This button now toggles the sidebar
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-[#1a213a]"
            aria-label="Toggle sidebar"
          >
            <MenuIcon size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Quirra</h1>
          <div className="flex-1"></div>
          {/* Reset Conversation button moved to header for quick access, similar to Gemini */}
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-sm bg-[#1a213a] text-gray-300 hover:bg-[#2a304e] hover:text-white transition-colors"
              disabled={isLoading}
            >
              <RotateCcw size={18} /> Reset
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full flex flex-col">
          {showWelcomeMessage && messages.length === 0 && (
            <div className="flex-1 flex flex-col justify-center items-center text-center text-gray-400 text-3xl font-semibold animate-fadeIn">
              How can I help you today?
            </div>
          )}

          <div className="flex flex-col gap-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`group relative rounded-xl px-4 py-3 max-w-[90%] text-base break-words ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white self-end rounded-br-none"
                    : "bg-[#1a213a] text-white self-start rounded-bl-none shadow-md border border-[#2a304e]"
                }`}
              >
                {/* Conditional rendering for the typing indicator */}
                {msg.role === "assistant" && msg.content === "" && isLoading ? (
                  <span className="animate-typing-dots text-lg"></span>
                ) : (
                  <>
                    <span>{msg.content}</span>
                    <button
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-gray-700 text-gray-300 hover:text-white transition-opacity duration-200"
                      onClick={() => copyToClipboard(msg.content, idx)}
                      title="Copy message"
                    >
                      {copiedMessageId === idx ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-4xl mx-auto p-4 bg-[#0A0B1A] border-t border-[#1a213a] flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={isLoading ? "Quirra is thinking..." : "Ask Quirra anything..."}
            className="flex-1 p-3 rounded-full bg-[#1a213a] text-white border border-[#2a304e] focus:outline-none focus:border-blue-500 placeholder-gray-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />

          {input.trim() && (
            <button
              type="submit"
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors duration-200"
              title="Send message"
              disabled={isLoading}
            >
              <Send size={20} />
            </button>
          )}
        </form>
      </div>
    </main>
  );
}