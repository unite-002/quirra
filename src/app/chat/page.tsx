// src/app/chat/page.tsx
"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { supabase } from "@/utils/supabase"; // Assuming this is your client-side Supabase setup
import { useRouter } from "next/navigation";
import {
  MenuIcon,
  Settings,
  PenSquare, // Used for 'New Chat' (compose icon in fixed toolbar) and inside sidebar for new chat
  Copy,
  Send,
  Loader2,
  LogOut,
  Check,
  RotateCcw,
  Laugh,
  Frown,
  Meh,
  Edit,
  Eraser,
  MoreVertical,
  Search, // Icon for search bar
  XCircle,
  Target, // Icon for Daily Focus and Goal Setting
  Smile, // Icon for Mood Logger
  Plus, // New icon for the floating button
  Upload, // Icon for file upload
  Library, // Icon for library
  User, // New icon for user profile
  ThumbsUp,      // ← add this
  ThumbsDown,    // ← add this
  Sparkles,
  Mountain,
  Lightbulb,
  Moon,
  Droplet,
  Flame,
  TreeDeciduous,
 } from "lucide-react";

import toast, { Toaster } from "react-hot-toast";
import { ThinkingOrb } from "@/components/ThinkingOrb";
import ChatInput from "@/components/ChatInput";
import QuirraBackground from "@/components/QuirraBackground";
import QuirraSidePanelBackground from "@/components/QuirraSidePanelBackground";
import QuirraSidebarBackground from "@/components/QuirraSidebarBackground";
import QuirraSearchDropdown from "@/components/QuirraSearchDropdown";
import LibraryPage from "@/components/QuirraLibrary/LibraryPage"
import ProfileDropdown from "@/components/ProfileDropdown";
import JourneyPage from "@/app/Journey/page";
import Link from "next/link";
import MessageToolbar from "@/components/MessageToolbar";
import SettingsDropdown from "@/components/Settings/SettingsDropdown";
import { SettingsProvider } from "@/components/Settings/useSettings";


import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { motion, AnimatePresence } from "framer-motion";

// Interface for code block props in ReactMarkdown
interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any; // Node from remark-gfm, can be any
}

// Interface for user personality profile data (consolidated definition)
interface PersonalityProfile {
  learning_style: string;
  communication_preference: string;
  feedback_preference: string;
  preferred_name: string | null;
}

// Type definition for a single chat message
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  // Optional discriminator for message kinds (text, image, file, etc.)
  type?: "text" | "image" | "file";
  // Optional URLs / metadata used when type is "image" or "file"
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  emotion_score?: number; // Optional sentiment score for user messages
  personality_profile?: PersonalityProfile; // Optional personality profile snapshot
  id: string; // Unique ID for the message
  created_at?: string; // Timestamp for when the message was created
  chat_session_id: string; // ID of the chat session this message belongs to
};

// Interface for user profile data fetched from Supabase
interface UserProfileData {
  username: string | null;
  full_name: string | null;
  personality_profile: PersonalityProfile | null;
  daily_token_usage: number; // Include daily_token_usage here
}

// Interface for a chat session object
interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

// Type definition for the custom modal's state
type ModalState = {
  isOpen: boolean;
  type: 'confirm' | 'prompt'; // Type of modal: confirmation or input prompt
  title: string;
  message: string;
  inputValue?: string; // Optional: for 'prompt' type modals to pre-fill input
  onConfirm?: (value?: string) => void; // Callback for confirm action
  onCancel?: () => void; // Callback for cancel action
};

// Define the width of the main sidebar when open (and replaces the fixed nav)
const SIDEBAR_WIDTH = '256px'; // Tailwind's w-64 is 256px

// Define the daily token limit for display purposes (matches backend)
const DAILY_TOKEN_LIMIT_CLIENT = 2000;

// Main Home component for the chat interface
export default function Home() {
  // State variables for chat messages and input
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  // Pending files (preview before sending)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // UI state for sidebar, loading indicators, and modals
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For ongoing API requests
  const [isInitialLoading, setIsInitialLoading] = useState(true); // For initial auth/data load
  const [isRegenerating, setIsRegenerating] = useState(false); // For message regeneration state
  const [showFloatingMenu, setShowFloatingMenu] = useState(false); // New state for floating menu

  const [userJourneyState, setUserJourneyState] = useState<
  "neutral" | "success" | "obstacle" | "goal" | "curious" | "sad" | "motivated" | "growth"
>("neutral");

useEffect(() => {
  if (!messages || messages.length === 0) return;

  const lastMsg = messages[messages.length - 1].content.toLowerCase();

  if (lastMsg.match(/(achieved|completed|finished|won|success|yay)/)) {
    setUserJourneyState("success");
  } else if (lastMsg.match(/(stuck|problem|blocked|fail|hard|difficult)/)) {
    setUserJourneyState("obstacle");
  } else if (lastMsg.match(/(goal|plan|target|aim|working on)/)) {
    setUserJourneyState("goal");
  } else if (lastMsg.match(/(how|learn|teach|explain|curious)/)) {
    setUserJourneyState("curious");
  } else if (lastMsg.match(/(sad|down|tired|overwhelmed|depressed)/)) {
    setUserJourneyState("sad");
  } else if (lastMsg.match(/(excited|driven|pumped|energy|fire)/)) {
    setUserJourneyState("motivated");
  } else if (lastMsg.match(/(growing|improving|progress|evolving)/)) {
    setUserJourneyState("growth");
  } else {
    setUserJourneyState("neutral");
  }
}, [messages]);


  // MAIN VIEW: which main area is visible
  const [activeMainView, setActiveMainView] = useState<'chat' | 'journey' | 'library'>('chat');

  // User and personality profile states
  const [userEmail, setUserEmail,
  ] = useState<string | null>(null);
  const [displayUserName, setDisplayUserName] = useState<string | null>(null);
  const [chatbotUserName, setChatbotUserName] = useState<string | null>(null);
  const [userPersonalityProfile, setUserPersonalityProfile] = useState<PersonalityProfile | null>(null);
  const [dailyTokenUsage, setDailyTokenUsage] = useState<number>(0); // New state for daily token usage

  // Chat session management states
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showSessionOptionsForId, setShowSessionOptionsForId] = useState<string | null>(null); // For chat session dropdown menu

  // 🧠 Automatically persist messages per chat session (ChatGPT-style)
useEffect(() => {
  try {
    if (!activeChatSessionId) return; // no session yet
    if (!messages) return;

    const key = `quirra_chat_messages_${activeChatSessionId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.warn("⚠️ Failed to save chat messages:", error);
  }
}, [messages, activeChatSessionId]);

  // Message interaction states
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null); // For copy-to-clipboard feedback
  const [showUserProfileOptions, setShowUserProfileOptions] = useState<boolean>(false); // State for user profile dropdown 
  const [showJourneySupport, setShowJourneySupport] = useState(false);

 // 💬 UI states for message actions
const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
const [editText, setEditText] = useState("");
const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
const [sharedMessageId, setSharedMessageId] = useState<string | null>(null);

// 🧠 Track votes for assistant messages
const [messageVotes, setMessageVotes] = useState<{ [id: string]: "up" | "down" | null }>({});

// ✏️ Edit message — with full history tracking like ChatGPT
const handleEditMessage = async (id: string, newText: string) => {
  try {
    // 🔹 Get current user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    const userId = session?.user?.id;
    if (!userId) {
      console.warn("⚠️ No user session found.");
      return;
    }

    // 🔹 Find old message content
    const oldMsg = messages.find((m) => m.id === id);
    if (!oldMsg) {
      console.warn("⚠️ Message not found for editing:", id);
      return;
    }

    // 🟢 Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: newText } : m))
    );

    // 🔹 Begin Supabase operations
    // 1️⃣ Save edit history
    const { error: historyError } = await supabase.from("message_edits").insert({
      message_id: id,
      user_id: userId,
      old_content: oldMsg.content,
      new_content: newText,
    });

    if (historyError) throw historyError;

    // 2️⃣ Update message content
    const { error: updateError } = await supabase
      .from("messages")
      .update({ content: newText })
      .eq("id", id);

    if (updateError) throw updateError;

    console.log(`✅ Message ${id} successfully updated and version saved`);
  } catch (err) {
    console.error("❌ Failed to update message or save history:", err);
  }
};

// 🕓 Load edit history for a message
const fetchMessageEditHistory = async (messageId: string) => {
  try {
    const { data, error } = await supabase
      .from("message_edits")
      .select("id, old_content, new_content, created_at")
      .eq("message_id", messageId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ Failed to fetch message edit history:", err);
    return [];
  }
};

// 🔄 Revert a message to an older version
const revertMessageToVersion = async (messageId: string, oldContent: string) => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    const userId = session?.user?.id;
    if (!userId) return;

    // Save current version before reverting
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    await supabase.from("message_edits").insert({
      message_id: messageId,
      user_id: userId,
      old_content: msg.content,
      new_content: oldContent,
    });

    // Apply revert
    const { error } = await supabase
      .from("messages")
      .update({ content: oldContent })
      .eq("id", messageId);

    if (error) throw error;

    // Update locally
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: oldContent } : m
      )
    );

    console.log(`✅ Message ${messageId} reverted to an earlier version`);
  } catch (err) {
    console.error("❌ Failed to revert message:", err);
  }
};

// 🕓 Fetch edit history for a message
const fetchEditHistory = async (messageId: string) => {
  try {
    const { data, error } = await supabase
      .from("message_edits")
      .select("id, previous_content, created_at")
      .eq("message_id", messageId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error("❌ Failed to load edit history:", err);
    return [];
  }
};


// 👍 Like message — persist to Supabase
const handleLike = async (id: string) => {
  try {
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.warn("⚠️ No active user session for like action");
      return;
    }

    const userId = session.user.id;
    const currentVote = messageVotes[id];
    const newVote = currentVote === "up" ? null : "up";

    // Optimistic UI update
    setMessageVotes((prev) => ({ ...prev, [id]: newVote }));

    if (newVote) {
      // 👍 Add or update like
      const { error } = await supabase
        .from("message_votes")
        .upsert(
          { user_id: userId, message_id: id, vote: "up" },
          { onConflict: "user_id,message_id" }
        );

      if (error) throw error;
      console.log(`✅ Message ${id} liked by ${userId}`);
    } else {
      // 🗑️ Remove existing like
      const { error } = await supabase
        .from("message_votes")
        .delete()
        .eq("user_id", userId)
        .eq("message_id", id);

      if (error) throw error;
      console.log(`✅ Like removed for message ${id}`);
    }
  } catch (err) {
    console.error("❌ Failed to update like:", err);
    // rollback optimistic change
    setMessageVotes((prev) => ({ ...prev, [id]: messageVotes[id] }));
  }
};

// 👎 Dislike message — persist to Supabase
const handleDislike = async (id: string) => {
  try {
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.warn("⚠️ No active user session for dislike action");
      return;
    }

    const userId = session.user.id;
    const currentVote = messageVotes[id];
    const newVote = currentVote === "down" ? null : "down";

    // Optimistic UI update
    setMessageVotes((prev) => ({ ...prev, [id]: newVote }));

    if (newVote) {
      // 👎 Add or update dislike
      const { error } = await supabase
        .from("message_votes")
        .upsert(
          { user_id: userId, message_id: id, vote: "down" },
          { onConflict: "user_id,message_id" }
        );

      if (error) throw error;
      console.log(`✅ Message ${id} disliked by ${userId}`);
    } else {
      // 🗑️ Remove existing dislike
      const { error } = await supabase
        .from("message_votes")
        .delete()
        .eq("user_id", userId)
        .eq("message_id", id);

      if (error) throw error;
      console.log(`✅ Dislike removed for message ${id}`);
    }
  } catch (err) {
    console.error("❌ Failed to update dislike:", err);
    // rollback optimistic change
    setMessageVotes((prev) => ({ ...prev, [id]: messageVotes[id] }));
  }
};

// 📤 Share message (ChatGPT-style behavior)
const shareMessage = async (msg: any) => {
  const text = msg.content;

  try {
    // ✅ Optional Supabase log (if you want analytics)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      await supabase.from("message_shares").insert({
        user_id: userId,
        message_id: msg.id,
      });
    }

    // ✅ Try native share on supported devices
    if (navigator.share) {
      await navigator.share({ text });
      setSharedMessageId(msg.id); // trigger "Shared ✅" animation
    } else {
      // ✅ Fallback for desktop
      await navigator.clipboard.writeText(text);
      setSharedMessageId(msg.id); // trigger animation
    }

    // Clear after short delay
    setTimeout(() => setSharedMessageId(null), 2000);
  } catch (err) {
    console.error("❌ Share failed or canceled:", err);
  }
};



// ♻️ Regenerate assistant response (fixed typing)
const regenerateResponse = async (msg: { id: string; content: string }) => {
  const fullMsg = messages.find((m) => m.id === msg.id);
  if (!fullMsg || fullMsg.role !== "assistant") return;
  if (!activeChatSessionId) {
    console.warn("No active chat session for regeneration.");
    return;
  }

  setIsRegenerating(true);

  try {
    // 1️⃣ Find the user message before this assistant reply
    const msgIndex = messages.findIndex((m) => m.id === fullMsg.id);
    const triggeringUserMsg =
      msgIndex > 0 ? [...messages].slice(0, msgIndex).reverse().find((m) => m.role === "user") : null;

    if (!triggeringUserMsg) {
      console.warn("⚠️ No user message found before this assistant message.");
      setIsRegenerating(false);
      return;
    }

    // 2️⃣ Replace assistant message with blank placeholder
    const placeholderId = crypto.randomUUID();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === fullMsg.id
          ? { ...m, id: placeholderId, content: "", created_at: new Date().toISOString() }
          : m
      )
    );

    // 3️⃣ Call your existing API streaming logic
    await sendToApiAndSave(messages, triggeringUserMsg, placeholderId, triggeringUserMsg.created_at);
  } catch (err) {
    console.error("❌ Error regenerating message:", err);
  } finally {
    setIsRegenerating(false);
  }
};


// === Load current user's votes for all messages in active session ===
const loadUserVotesForSession = useCallback(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId || !activeChatSessionId) return;

    const { data: votes, error } = await supabase
      .from("message_votes")
      .select("message_id, vote")
      .eq("user_id", userId)
      .in("message_id", messages.map((m) => m.id));

    if (error) {
      console.error("Failed to load message votes:", error);
      return;
    }

    const map: { [id: string]: "up" | "down" | null } = {};
    (votes || []).forEach((v: any) => (map[v.message_id] = v.vote));
    setMessageVotes(map);
  } catch (err) {
    console.error("Error loading votes:", err);
  }
}, [activeChatSessionId, messages]);

 // === SETTINGS DROPDOWN HELPERS ===

// Clears all chat history
const handleDeleteChatHistory = useCallback(async () => {
  try {
    const response = await fetch("/api/delete-all-history", { method: "POST" });
    if (!response.ok) throw new Error("Failed to delete chat history");

    setChatSessions([]);
    setMessages([]);
    setActiveChatSessionId(null);
    setIsChatEmpty(true);

    toast.success("All chat history deleted!");
  } catch (err) {
    console.error("Error deleting chat history:", err);
    toast.error("Failed to delete chat history");
  }
}, []);

// Theme toggle state
const [theme, setTheme] = useState<"dark" | "light">("dark");

const toggleTheme = useCallback(() => {
  const newTheme = theme === "dark" ? "light" : "dark";
  setTheme(newTheme);
  document.documentElement.classList.toggle("dark", newTheme === "dark");
  toast.success(`Switched to ${newTheme} mode`);
}, [theme]);

  
  // --- Reusable IconButton for toolbar actions ---
  type IconButtonProps = {
  onClick?: (e?: any) => void;
  title?: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  title,
  children,
  disabled = false,
  className = "",
}) => {
  return (
    <button
      onClick={(e) => {
        if (!disabled) onClick?.(e);
      }}
      title={title}
      disabled={disabled}
      className={`
        w-9 h-9 p-2 flex items-center justify-center rounded-md
        text-gray-300 hover:text-gray-400
        transition-opacity transition-transform duration-150 ease-out
        opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
        active:scale-95 focus:outline-none
        focus:ring-2 focus:ring-offset-2 focus:ring-blue-400/30
        ${className}
      `}
    >
      {children}
    </button>
  );
};

const JourneyIcon: React.FC<{ state: string; size?: number }> = ({ state, size = 20 }) => {
  const baseClass = "text-gray-300";

  switch (state) {
    case "success":
      return (
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <Sparkles className={baseClass} size={size} />
        </motion.div>
      );
    case "obstacle":
      return (
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Mountain className={baseClass} size={size} />
        </motion.div>
      );
    case "goal":
      return (
        <motion.div animate={{ rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Target className={baseClass} size={size} />
        </motion.div>
      );
    case "curious":
      return (
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Lightbulb className={baseClass} size={size} />
        </motion.div>
      );
    case "sad":
      return (
        <motion.div animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <Droplet className={baseClass} size={size} />
        </motion.div>
      );
    case "motivated":
      return (
        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
          <Flame className={baseClass} size={size} />
        </motion.div>
      );
    case "growth":
      return (
        <motion.div animate={{ scale: [0.95, 1.05, 0.95] }} transition={{ repeat: Infinity, duration: 3 }}>
          <TreeDeciduous className={baseClass} size={size} />
        </motion.div>
      );
    default:
      return (
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Moon className={baseClass} size={size} />
        </motion.div>
      );
  }
};
  
  // --- Search UI state & refs ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchPage, setSearchPage] = useState<number>(0);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState<boolean>(true);
  const [searchContext, setSearchContext] = useState<'chats' | 'docs'>('chats');
  const [selectedResult, setSelectedResult] = useState<number>(-1);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchResultsRef = useRef<HTMLDivElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // 🔹 Add this missing line
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const SEARCH_PAGE_SIZE = 12; // tweakable

  // Highlighted message when navigating from search
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // New state for dynamic input position
  const [isChatEmpty, setIsChatEmpty] = useState(true);

  // 🔹 Track scroll position to fade input like ChatGPT
const [isScrolledUp, setIsScrolledUp] = useState(false);

useEffect(() => {
  const container = messagesContainerRef.current;
  if (!container) return;

  const handleScroll = () => {
    // check if user is near bottom
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 20;
    setIsScrolledUp(!isNearBottom);
  };

  container.addEventListener("scroll", handleScroll);
  return () => container.removeEventListener("scroll", handleScroll);
}, []);

  // 🧠 Random greeting logic (ChatGPT-style)
const greetings = [
  "How can I help you today?",
  "What can I do for you?",
  "Need help with something?",
  "What’s on your mind today?",
  "Ready to create something new?",
  "How are you feeling today?",
  "What would you like to explore?",
  "Looking for some inspiration?",
];

const [randomGreeting, setRandomGreeting] = useState(
  greetings[Math.floor(Math.random() * greetings.length)]
);

useEffect(() => {
  if (isChatEmpty) {
    const random = greetings[Math.floor(Math.random() * greetings.length)];
    setRandomGreeting(random);
  }
}, [isChatEmpty]);


// ===== typing / streaming helpers (TOP-LEVEL in the component) =====
const [renderedMessages, setRenderedMessages] = useState<Record<string, string>>({});
const typingTimersRef = useRef<Record<string, number | null>>({});

// cleanup timers when component unmounts
useEffect(() => {
  return () => {
    Object.values(typingTimersRef.current).forEach((t) => {
      if (t) clearInterval(t as number);
    });
    typingTimersRef.current = {};
  };
}, []);

// typing effect: start typing for assistant messages that don't yet have rendered content
useEffect(() => {
  // remove timers for messages that no longer exist
  const currentIds = new Set(messages.map((m) => m.id));
  Object.keys(typingTimersRef.current).forEach((id) => {
    if (!currentIds.has(id)) {
      const t = typingTimersRef.current[id];
      if (t) clearInterval(t as number);
      delete typingTimersRef.current[id];
    }
  });

  // start typing for any assistant message that isn't rendered yet
  messages.forEach((msg) => {
    if (msg.role !== "assistant" || renderedMessages[msg.id] !== undefined || !msg.content) return;

    const chars = msg.content.split("");
    let index = 0;

    // dynamic base speed
    let baseSpeed = 24;
    const len = chars.length;
    if (len < 100) baseSpeed = 14;
    else if (len < 400) baseSpeed = 22;
    else baseSpeed = 32;

    if (/```/.test(msg.content)) baseSpeed = 10; // code => faster
    if (/^-|\d+\./m.test(msg.content)) baseSpeed *= 0.85; // lists => confident
    if (/[!?]|—|…/.test(msg.content)) baseSpeed *= 1.4; // emotional => slower

    const punctuation = /[.,;!?]/;

    // clear previous timer if any
    if (typingTimersRef.current[msg.id]) {
      clearInterval(typingTimersRef.current[msg.id] as number);
      delete typingTimersRef.current[msg.id];
    }

    const startTyping = () => {
      typingTimersRef.current[msg.id] = window.setInterval(() => {
        const next = chars[index];
        setRenderedMessages((prev) => ({
          ...prev,
          [msg.id]: (prev[msg.id] || "") + next,
        }));
        index++;

        if (punctuation.test(next)) {
          // brief pause after punctuation
          if (typingTimersRef.current[msg.id]) {
            clearInterval(typingTimersRef.current[msg.id] as number);
            typingTimersRef.current[msg.id] = null;
          }
          setTimeout(() => {
            if (index < chars.length) startTyping();
          }, baseSpeed * 3);
        }

        if (index >= chars.length) {
          if (typingTimersRef.current[msg.id]) {
            clearInterval(typingTimersRef.current[msg.id] as number);
            typingTimersRef.current[msg.id] = null;
            delete typingTimersRef.current[msg.id];
          }
        }
      }, baseSpeed);
    };

    startTyping();
  });

// only re-run when `messages` identity changes
}, [messages]); // eslint-disable-line react-hooks/exhaustive-deps



  // Modal state
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
  });



  // Refs for DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling to the latest message
  const textareaRef = useRef<HTMLTextAreaElement>(null); // For auto-resizing the input textarea
  const modalInputRef = useRef<HTMLInputElement>(null); // Ref for modal input field
  const sessionOptionsRef = useRef<HTMLDivElement>(null); // Ref for closing session options on outside click
  const floatingMenuRef = useRef<HTMLDivElement>(null); // Ref for floating menu to close on outside click
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [showSidebarProfileOptions, setShowSidebarProfileOptions] = useState(false);
  const [showFloatingProfileOptions, setShowFloatingProfileOptions] = useState(false);
  const [streamingMessages, setStreamingMessages] = useState<{ [key: string]: string }>({});


// Controls visibility of the Settings dropdown
const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
 
  useEffect(() => {
    // Auto-scroll to bottom whenever new messages are added
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // 🟢 Split user profile dropdown into two separate refs
  const floatingUserProfileRef = useRef<HTMLDivElement>(null);  // For avatar + floating dropdown (when sidebar is closed)
  const sidebarUserProfileRef = useRef<HTMLDivElement>(null);   // For sidebar dropdown (when sidebar is open)

  const router = useRouter(); // Next.js router for navigation


// Effect to close the session options menu, floating menu, user profile options, and search dropdown when clicking outside
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (sessionOptionsRef.current && !sessionOptionsRef.current.contains(event.target as Node)) {
      setShowSessionOptionsForId(null);
    }
    if (floatingMenuRef.current && !floatingMenuRef.current.contains(event.target as Node)) {
      setShowFloatingMenu(false);
    }
    if (
      (floatingUserProfileRef.current && !floatingUserProfileRef.current.contains(event.target as Node)) &&
      (sidebarUserProfileRef.current && !sidebarUserProfileRef.current.contains(event.target as Node))
    ) {
      setShowUserProfileOptions(false);
    }
    if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
      setIsSearchOpen(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  // Highlight matched query inside snippets
  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <mark className="bg-blue-400/20 px-0.5 rounded">
          {text.substring(idx, idx + q.length)}
        </mark>
        {text.substring(idx + q.length)}
      </>
    );
  };

 // Fetch search results (sessions + messages)
const fetchSearchResults = async (query: string, page = 0, append = false) => {
  if (!query.trim()) {
    setSearchResults([]);
    setHasMoreSearchResults(true);
    setSearchLoading(false);
    return;
  }

  if (searchAbortRef.current) searchAbortRef.current.abort();
  searchAbortRef.current = new AbortController();

  setSearchLoading(true);
  try {
    const from = page * SEARCH_PAGE_SIZE;
    const to = from + SEARCH_PAGE_SIZE - 1;

    // Get logged-in user (so we only return this user's data)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.error("Failed to get user for search:", userErr);
      setSearchLoading(false);
      return;
    }
    const userId = userData?.user?.id;
    if (!userId) {
      console.warn("No logged-in user for search.");
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    if (searchContext === "chats") {
      // Sessions (only this user's sessions)
      const { data: sessions } = await supabase
        .from("chat_sessions")
        .select("id, title, created_at")
        .ilike("title", `%${query}%`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      // Messages (only this user's messages)
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, chat_session_id, created_at")
        .ilike("content", `%${query}%`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      const mapped: any[] = [];

      sessions?.forEach((s: any) =>
        mapped.push({
          kind: "session",
          id: s.id,
          title: s.title || "Untitled chat",
          snippet: s.title || "",
          chat_session_id: s.id,
          date: s.created_at,
        })
      );

      messages?.forEach((m: any) => {
        const text = typeof m.content === "string" ? m.content : "";
        const snippet = text.length > 160 ? text.slice(0, 157) + "..." : text;
        mapped.push({
          kind: "message",
          id: m.id,
          title: "",
          snippet,
          chat_session_id: m.chat_session_id,
          date: m.created_at,
        });
      });

      // Deduplicate preserving first seen order
      const unique: any[] = [];
      const seen = new Set<string>();
      for (const r of mapped) {
        const key = r.kind === "session" ? `s:${r.id}` : `m:${r.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(r);
        }
      }

      // Sort by date descending so sections and order are consistent
      unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setSearchResults((prev) => (append ? [...prev, ...unique] : unique));

      // If either sessions or messages returned a full page, assume more may exist
      const more =
        (sessions && sessions.length === SEARCH_PAGE_SIZE) ||
        (messages && messages.length === SEARCH_PAGE_SIZE) ||
        unique.length >= SEARCH_PAGE_SIZE;
      setHasMoreSearchResults(Boolean(more));
      setSearchPage(page);
    } else {
      // Docs search placeholder (if you later add docs, filter by user if needed)
      setSearchResults([]);
      setHasMoreSearchResults(false);
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.name !== "AbortError") {
        console.error("Search failed:", err);
      }
    } else {
      console.error("Search failed:", err);
    }
  } finally {
    setSearchLoading(false);
  }
};

// 🔹 Handle clicking or pressing Enter on a search result
const handleResultClick = async (res: any) => {
  // close UI quickly
  setIsSearchOpen(false);
  setSearchQuery("");
  setSearchResults([]);

  console.log("Search result clicked:", res);

  // If the result belongs to another chat session, switch to it first
  if (res.chat_session_id && res.chat_session_id !== activeChatSessionId) {
    await handleSwitchChatSession(res.chat_session_id);
  }

  // Now wait for the message element to exist in the DOM, using requestAnimationFrame polling
  let attempts = 0;
  const maxAttempts = 20; // ~20 * ~50ms typical => ~1s
  const tryScroll = () =>
    new Promise<void>((resolve) => {
      const check = () => {
        const el = document.getElementById(`message-${res.id}`);
        if (el) {
          // smooth scroll and highlight
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedMessageId(res.id);

          // optional DOM animate for a nicer fade (also kept by class)
          try {
            // tiny safe animate; browsers may ignore unsupported props
            (el as HTMLElement).animate(
              [
                { backgroundColor: "rgba(0,224,255,0.18)" },
                { backgroundColor: "transparent" },
              ],
              { duration: 1000, easing: "ease-out" }
            );
          } catch (e) {
            /* ignore if animate not supported */
          }

          // clear highlight after animation duration
          setTimeout(() => setHighlightedMessageId(null), 1000);
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          // use requestAnimationFrame so we check right after DOM paint
          requestAnimationFrame(check);
        } else {
          console.warn("Could not find message element to scroll to:", res.id);
          resolve();
        }
      };
      check();
    });

  await tryScroll();
};

  // 🔹 Infinite scroll handler
  const onResultsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      !searchLoading &&
      hasMoreSearchResults &&
      el.scrollTop + el.clientHeight >= el.scrollHeight - 80
    ) {
      const next = searchPage + 1;
      fetchSearchResults(searchQuery.trim(), next, true);
      setSearchPage(next);
    }
  };

  // 🔹 Debounced live search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasMoreSearchResults(true);
      return;
    }

    const timeout = setTimeout(() => {
      fetchSearchResults(searchQuery.trim(), 0, false);
      setIsSearchOpen(true);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchContext]);

  // 🔹 Close search dropdown with ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);


  // Effect to focus modal input when it opens
  useEffect(() => {
    if (modalState.isOpen && modalState.type === 'prompt' && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [modalState]);

  // Effect to scroll to the latest message whenever messages change (only when chat is not empty)
  useEffect(() => {
    if (!isChatEmpty) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatEmpty]);


  // Effect to auto-resize the textarea based on input content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to recalculate
      const lineHeight = parseFloat(getComputedStyle(textareaRef.current).lineHeight);
      const maxHeight = lineHeight * 6; // Max 6 lines as per user request
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
      if (textareaRef.current.scrollHeight > maxHeight) {
        textareaRef.current.style.overflowY = 'auto'; // Enable scroll if content exceeds max height
      } else {
        textareaRef.current.style.overflowY = 'hidden'; // Hide scroll otherwise
      }
    }
  }, [input]); // Dependency on input content

  // Function to display an in-app message (replaces alert for errors/warnings)
  const displayInAppMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant" as const, // Explicitly type as 'assistant'
        content: `⚠️ ${content}`,
        id: crypto.randomUUID(),
        chat_session_id: activeChatSessionId || "temp-session-error", // Use current session or a temp ID
        created_at: new Date().toISOString(),
      },
    ]);
    setIsChatEmpty(false); // Make sure chat is not empty to show error
  }, [activeChatSessionId]); // Dependency on activeChatSessionId

 // Core Function to Create a New Chat Session (DB only, no UI reset)
const createNewChatSession = useCallback(async () => {
  const newSessionId = crypto.randomUUID();

  try {
    const res = await fetch("/api/chat/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: newSessionId }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        errorData.message ||
          "Failed to create new chat session on the backend."
      );
    }

    const newSessionData: ChatSession = await res.json();

    // ✅ Set and remember the new active session (for reload persistence)
    setActiveChatSessionId(newSessionData.id);
    localStorage.setItem("quirra_last_active_session", newSessionData.id);

    // Add to sessions list immediately
    setChatSessions((prev) => [newSessionData, ...prev]);
    console.log(`✅ New conversation session created: ${newSessionData.id}`);

    // 🧠 Reset UI state for new chat
    setMessages([]);
    localStorage.removeItem(`quirra_chat_messages_${newSessionData.id}`);
    setIsChatEmpty(true);

    return newSessionData.id;
  } catch (error: any) {
    console.error("❌ Error creating new chat session via API:", error.message);
    displayInAppMessage(
      `Failed to start a new chat session: ${error.message}. You might not be able to save messages.`
    );

    // 🧩 Still set as active locally (for offline flow)
    setActiveChatSessionId(newSessionId);
    localStorage.setItem("quirra_last_active_session", newSessionId);

    setMessages([]);
    localStorage.removeItem(`quirra_chat_messages_${newSessionId}`);
    setIsChatEmpty(true);

    return newSessionId; // still return local ID so chat works
  }
}, [displayInAppMessage]);

// ✅ Authentication + Initial History Loader (ChatGPT-like, final version)
const checkAuthAndLoadHistory = useCallback(async () => {
  // ⚡ Prevent redundant reload if chats are already in memory
  if (chatSessions.length > 0 && activeChatSessionId) {
    console.log("✅ Chat sessions already loaded, skipping reload.");
    return;
  }

  setIsInitialLoading(true);

  try {
    // 1️⃣ Validate user session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      console.warn("⚠️ No session found or error fetching session:", error?.message);
      router.push("/login");
      setIsInitialLoading(false);
      return;
    }

    const userId = session.user.id;
    setUserEmail(session.user.email ?? null);

    // 2️⃣ Load user profile
    const { data: fetchedProfile, error: profileError } = await supabase
      .from("profiles")
      .select("username, full_name, personality_profile, daily_token_usage")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("❌ Failed to load profile:", profileError.message);
    }

    if (fetchedProfile) {
      setDailyTokenUsage(fetchedProfile.daily_token_usage || 0);
    }

    // 3️⃣ Determine display name
    const preferred =
      fetchedProfile?.personality_profile?.preferred_name ||
      fetchedProfile?.full_name?.split(" ")[0] ||
      fetchedProfile?.username ||
      session.user.email?.split("@")[0] ||
      "User";

    const displayName = preferred.replace(/[._]/g, " ");
    setDisplayUserName(displayName);
    setChatbotUserName(displayName);

    // 4️⃣ Handle personality profile
    const storedProfile = localStorage.getItem("quirra_personality_profile");
    const parsedStored = storedProfile ? JSON.parse(storedProfile) : null;
    const finalProfile =
      fetchedProfile?.personality_profile || parsedStored || null;

    if (fetchedProfile?.personality_profile) {
      localStorage.setItem(
        "quirra_personality_profile",
        JSON.stringify(fetchedProfile.personality_profile)
      );
    } else if (!finalProfile) {
      localStorage.removeItem("quirra_personality_profile");
    }
    setUserPersonalityProfile(finalProfile);

    // 5️⃣ Load user chat sessions
    const { data: sessions, error: sessionsErr } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (sessionsErr) {
      console.error("❌ Failed to load sessions:", sessionsErr.message);
      displayInAppMessage("Failed to load chat sessions.");
      setIsInitialLoading(false);
      return;
    }

    if (!sessions || sessions.length === 0) {
      console.log("🟡 No sessions found for user — starting fresh.");
      setChatSessions([]);
      setActiveChatSessionId(null);
      setMessages([]);
      localStorage.removeItem("quirra_chat_messages");
      setIsChatEmpty(true);
      setIsInitialLoading(false);
      return;
    }

    // ✅ Sort and set sessions
    const sortedSessions = sessions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setChatSessions(sortedSessions);

    // 🔹 Try to restore the last active session from localStorage
    const lastActive = localStorage.getItem("quirra_last_active_session");
    const restoreSession =
      sortedSessions.find((s) => s.id === lastActive)?.id ||
      sortedSessions[0].id;

    setActiveChatSessionId(restoreSession);

    // 6️⃣ Load messages for that session (merge local + server)
    const { data: serverMessages, error: messagesErr } = await supabase
      .from("messages")
      .select(
        "id, role, content, emotion_score, personality_profile, created_at, chat_session_id"
      )
      .eq("user_id", userId)
      .eq("chat_session_id", restoreSession)
      .order("created_at", { ascending: true });

    if (messagesErr) {
      console.error("❌ Failed to load messages:", messagesErr.message);
      displayInAppMessage("Failed to load your chat messages.");
      setMessages([]);
      setIsChatEmpty(true);
    } else {
      // 🧠 Merge local cached messages (ChatGPT-like persistence)
      let cached: ChatMessage[] = [];
      try {
        const raw = localStorage.getItem(`quirra_chat_messages_${restoreSession}`);
        if (raw) cached = JSON.parse(raw);
      } catch {
        cached = [];
      }

      const map = new Map<string, ChatMessage>();
      for (const msg of cached) map.set(msg.id, msg);
      for (const msg of serverMessages) map.set(msg.id, msg);

      const merged = Array.from(map.values()).sort(
        (a, b) =>
          new Date(a.created_at || "").getTime() -
          new Date(b.created_at || "").getTime()
      );

      setMessages(merged);
      setIsChatEmpty(merged.length === 0);

      // 🗂️ Save merged messages locally (ChatGPT-style persistence)
      localStorage.setItem(
        `quirra_chat_messages_${restoreSession}`,
        JSON.stringify(merged)
      );
      
      // ✅ Load votes for all assistant messages in this session
      await loadUserVotesForSession();

    }
  } catch (err: any) {
    console.error("❌ Unexpected error in checkAuthAndLoadHistory:", err.message);
    displayInAppMessage("An error occurred while loading your chat history.");

    // Attempt to restore local messages if available
    try {
      const lastActive = localStorage.getItem("quirra_last_active_session");
      const raw = localStorage.getItem(`quirra_chat_messages_${lastActive}`);
      if (raw) {
        const cached = JSON.parse(raw);
        setMessages(cached);
        setIsChatEmpty(cached.length === 0);
      }
    } catch {
      setMessages([]);
      setIsChatEmpty(true);
    }
  } finally {
    setIsInitialLoading(false);
  }
}, [router, chatSessions.length, activeChatSessionId, displayInAppMessage]);

// ✅ Run once on mount (not on every state change)
useEffect(() => {
  checkAuthAndLoadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  // Function to send message to API and save to Supabase
  const sendToApiAndSave = async (
    currentMessagesForContext: ChatMessage[],
    userMessageToProcess: ChatMessage,
    assistantPlaceholderId: string,
    originalUserMessageCreatedAt?: string // Used for regeneration logic
  ) => {
    if (!activeChatSessionId) {
      console.error("No active chat session ID. Cannot send message or save.");
      displayInAppMessage("Error: No active chat session. Please try starting a new chat.");
      setIsLoading(false);
      setIsRegenerating(false);
      return;
    }

    setIsLoading(true);
    let accumulatedAssistantResponse = "";
    let detectedEmotionScore: number | undefined;

    try {
            // --- compute refinedPrompt (currently a 1:1 fallback to raw content)
      // Later: if you expose an `activeCommand` variable here, you can apply
      // a client-side COMMAND_PROMPT_MAP to create richer refined prompts.
      const refinedPrompt = ((): string => {
        // Example placeholder for future command-aware mapping:
        // if (activeCommand && clientCommandPromptMap[activeCommand]) {
        //   return clientCommandPromptMap[activeCommand](userMessageToProcess.content);
        // }
        return userMessageToProcess.content;
      })();

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // keep the original raw prompt for backward compatibility
          prompt: userMessageToProcess.content,
          // new: refined prompt that the server will prefer when present
          refinedPrompt,
          userName: chatbotUserName,
          personalityProfile: userPersonalityProfile,
          messages: currentMessagesForContext.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          chatSessionId: activeChatSessionId,
          isRegenerating: isRegenerating,
          currentMessageId: userMessageToProcess.id,
        }),
      });


      if (!res.ok || !res.body) {
        const errorText = await res.text();
        // Check for 429 Too Many Requests specifically for token limits
        if (res.status === 429) {
            displayInAppMessage(`🚫 You have exceeded your daily token limit. Please try again tomorrow.`);
        } else {
            throw new Error(`HTTP error! status: ${res.status}, Message: ${errorText || 'Unknown error'}`);
        }
        setIsLoading(false);
        setIsRegenerating(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      // Stream the response from the API
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete last line in buffer

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.substring(5).trim();
            if (jsonStr === '[DONE]') {
              done = true; // Signal end of stream
              break;
            }
            try {
              const data = JSON.parse(jsonStr);

              // Handle different types of streamed data
              if (data.type === 'proactive_message') {
                // Add the proactive message as a new assistant message
                setMessages((prevMessages) => {
                    const newProactiveMessage: ChatMessage = {
                        role: "assistant" as const,
                        content: data.content,
                        id: data.id,
                        chat_session_id: data.chatSessionId,
                        created_at: data.created_at,
                    };
                    // Insert the proactive message before the *main* assistant message placeholder
                    const assistantMsgIndex = prevMessages.findIndex(msg => msg.id === assistantPlaceholderId);
                    if (assistantMsgIndex !== -1) {
                        const updated = [...prevMessages];
                        updated.splice(assistantMsgIndex, 0, newProactiveMessage);
                        return updated;
                    }
                    return [...prevMessages, newProactiveMessage]; // Fallback if placeholder not found (shouldn't happen)
                });
              } else if (data.type === 'llm_response_chunk') {
                const deltaContent = data.content || '';
                accumulatedAssistantResponse += deltaContent;

                // Update the assistant's message in real-time
                setMessages((prevMessages) => {
                  const updatedMessages = [...prevMessages];
                  const assistantMsgIndex = updatedMessages.findIndex(msg => msg.id === assistantPlaceholderId);

                  if (assistantMsgIndex !== -1) {
                    updatedMessages[assistantMsgIndex] = {
                      ...updatedMessages[assistantMsgIndex],
                      content: accumulatedAssistantResponse,
                    };
                  }
                  return updatedMessages;
                });
                // Update daily token usage here for real-time feedback
                if (typeof data.dailyTokenUsage === 'number') {
                    setDailyTokenUsage(data.dailyTokenUsage);
                }
              } else {
                // Fallback for general content or if emotion_score is sent as part of the first chunk
                if (typeof data.emotion_score === 'number' && detectedEmotionScore === undefined) {
                  detectedEmotionScore = data.emotion_score;
                }
                const deltaContent = data.content || ''; // This might be empty if emotion_score is the only field
                if (deltaContent) { // Only append if there's actual content
                  accumulatedAssistantResponse += deltaContent;

                  setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages];
                    const assistantMsgIndex = updatedMessages.findIndex(msg => msg.id === assistantPlaceholderId);

                    if (assistantMsgIndex !== -1) {
                      updatedMessages[assistantMsgIndex] = {
                        ...updatedMessages[assistantMsgIndex],
                        content: accumulatedAssistantResponse,
                      };
                    };
                    return updatedMessages;
                  });
                }
                // Update daily token usage here for real-time feedback
                if (typeof data.dailyTokenUsage === 'number') {
                    setDailyTokenUsage(data.dailyTokenUsage);
                }
              }
            } catch (e) {
              console.error("Error parsing JSON from stream chunk:", e, "Raw:", jsonStr);
            }
          }
        }
      }

      // Finalize the user message with the detected emotion score
      const finalUserMessage = {
        ...userMessageToProcess,
        emotion_score: detectedEmotionScore,
        created_at: new Date().toISOString(), // Ensure a fresh timestamp for saving
        chat_session_id: activeChatSessionId,
      };

      // Update the user message in state with the emotion score
      setMessages((prev) => {
        const updatedMessages = [...prev];
        const userMsgIndex = updatedMessages.findIndex(msg => msg.id === userMessageToProcess.id);
        if (userMsgIndex !== -1) {
          updatedMessages[userMsgIndex] = finalUserMessage;
        }
        return updatedMessages;
      });

      // Save messages to Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        // Check if session exists in state (for initial message in new session case)
        const sessionExistsInState = chatSessions.some(s => s.id === activeChatSessionId);
        if (!sessionExistsInState) {
          console.warn("Session not found in local state, but activeChatSessionId is set. This might indicate an out-of-sync state or initial message in a new session.");
        }

        // If regenerating (editing a previous message), delete subsequent messages in DB
        if (originalUserMessageCreatedAt) {
          const { error: deleteError } = await supabase
            .from("messages")
            .delete()
            .eq('user_id', userId)
            .eq('chat_session_id', activeChatSessionId)
            .gte('created_at', originalUserMessageCreatedAt); // Delete messages from the edited point onwards

          if (deleteError) {
            console.error("❌ Failed to clear subsequent messages in DB:", deleteError.message);
          } else {
            console.log("Subsequent messages cleared from database after edit.");
          }
        }

        // Upsert (insert or update) the user message
        const { error: userMessageError } = await supabase
          .from("messages")
          .upsert({
            id: userMessageToProcess.id,
            user_id: userId,
            role: "user",
            content: finalUserMessage.content,
            emotion_score: finalUserMessage.emotion_score,
            personality_profile: userPersonalityProfile,
            created_at: finalUserMessage.created_at,
            chat_session_id: activeChatSessionId,
          }, { onConflict: 'id' }); // Conflict on 'id' means update if exists

        if (userMessageError) {
          console.error("❌ Failed to save/update user message:", userMessageError.message);
        }

        // Insert the assistant message (main LLM response)
        // Only save if there was actual content from the LLM, not just proactive messages
        if (accumulatedAssistantResponse.length > 0) {
          const { error: assistantMessageError } = await supabase
            .from("messages")
            .insert({
              user_id: userId,
              role: "assistant",
              content: accumulatedAssistantResponse,
              created_at: new Date().toISOString(),
              chat_session_id: activeChatSessionId,
            });

          if (assistantMessageError) {
            console.error("❌ Failed to save assistant message:", assistantMessageError.message);
          }
        } else {
            console.log("No main LLM response to save (might have been only a proactive message).");
        }


        // Update chat session title if it's still "New Chat" and this is the first message
        const currentSessionInState = chatSessions.find(s => s.id === activeChatSessionId);
        if (currentSessionInState && currentSessionInState.title === "New Chat" && !originalUserMessageCreatedAt) {
          const generatedTitle = userMessageToProcess.content.substring(0, 50).split('\n')[0].trim();
          const newTitle = generatedTitle.length > 0 ? generatedTitle : "New Chat"; // Fallback if prompt is empty
          const { error: titleUpdateError } = await supabase
            .from("chat_sessions")
            .update({ title: newTitle })
            .eq('id', activeChatSessionId);

          if (titleUpdateError) {
            console.error("❌ Failed to update chat session title:", titleUpdateError.message);
          } else {
            console.log("Chat session title updated:", newTitle);
            // Update the title in local state immediately
            setChatSessions(prev => prev.map(session =>
              session.id === activeChatSessionId ? { ...session, title: newTitle } : session
            ));
          }
        }

      } else {
        console.warn("User ID not available, messages not saved to DB.");
      }

    } catch (err: any) {
      console.error("❌ Chat submission error:", err.message);
      displayInAppMessage(`Failed to get a response from Quirra. Please check your internet connection or try again. (${err.message.substring(0, 100)}...)`);
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

 // Handler for submitting a new message or editing an existing one
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault(); // Prevent default form submission behavior
  await handleSendMessage(); // Call the consolidated send message logic
};

// New consolidated function to handle sending a message (from form submit or Enter key)
const handleSendMessage = async () => {
  // Prevent concurrent sends
  if (isLoading) return;

  // Require either text or at least one staged file
  if (!input.trim() && pendingFiles.length === 0) {
    return;
  }

  // Ensure a session exists
  if (!activeChatSessionId) {
    const newSessionId = await createNewChatSession();
    if (!newSessionId) {
      displayInAppMessage("Failed to start a new chat session. Please try again.");
      return;
    }
  }

  setIsLoading(true);

  // Upload pending files first (collect successful signed URLs)
  const uploadedUrls: string[] = [];
  try {
    if (pendingFiles.length > 0) {
      for (const file of pendingFiles) {
        try {
          const path = `user-uploads/${Date.now()}-${file.name}`;
          const { data, error } = await supabase.storage.from("uploads").upload(path, file);
          if (error) throw error;

          const { data: signed, error: signedErr } = await supabase.storage
            .from("uploads")
            .createSignedUrl(data.path, 60 * 60);

          if (signedErr) throw signedErr;
          if (signed?.signedUrl) {
            uploadedUrls.push(signed.signedUrl);
          } else {
            displayInAppMessage(`❌ Could not create signed URL for ${file.name}.`);
          }
        } catch (err: any) {
          console.error("Upload failed for file:", file.name, err?.message || err);
          displayInAppMessage(`❌ Failed to upload ${file.name}: ${err?.message || "unknown error"}`);
        }
      }
    }

    // Build final content (text + uploaded URLs)
    let finalContent = input.trim();
    for (const url of uploadedUrls) finalContent += `\n${url}`;

    // Clear staged files & input
    setPendingFiles([]);
    setInput("");

    // Prepare messages & call sendToApiAndSave as you already do
    let userMessageToProcess: ChatMessage;
    let currentMessagesForContext: ChatMessage[];
    let originalUserMessageCreatedAt: string | undefined;
    const assistantPlaceholderId = crypto.randomUUID();

    if (editingMessageId) {
      setIsRegenerating(true);
      const originalMessageIndex = messages.findIndex(
        (msg) => msg.id === editingMessageId && msg.role === "user"
      );
      if (originalMessageIndex === -1) {
        console.error("Attempted to edit a user message not found.");
        setEditingMessageId(null);
        setIsRegenerating(false);
        setIsLoading(false);
        return;
      }

      userMessageToProcess = {
        ...messages[originalMessageIndex],
        content: finalContent,
        chat_session_id: activeChatSessionId!,
      };
      originalUserMessageCreatedAt = messages[originalMessageIndex].created_at;

      const messagesBeforeEdit = messages.slice(0, originalMessageIndex);
      currentMessagesForContext = [...messagesBeforeEdit, userMessageToProcess];

      setMessages([
        ...currentMessagesForContext,
        { role: "assistant" as const, content: "", id: assistantPlaceholderId, chat_session_id: activeChatSessionId! },
      ]);
      setEditingMessageId(null);
    } else {
      userMessageToProcess = {
        role: "user" as const,
        content: finalContent,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        chat_session_id: activeChatSessionId!,
      };
      currentMessagesForContext = [...messages, userMessageToProcess];

      setMessages((prev) => [
        ...prev,
        userMessageToProcess,
        { role: "assistant" as const, content: "", id: assistantPlaceholderId, chat_session_id: activeChatSessionId! },
      ]);
    }

    setIsChatEmpty(false);

    await sendToApiAndSave(
      currentMessagesForContext,
      userMessageToProcess,
      assistantPlaceholderId,
      originalUserMessageCreatedAt
    );
  } catch (err) {
    console.error("handleSendMessage error:", err);
    displayInAppMessage("An unexpected error occurred while sending your message.");
  } finally {
    setIsRegenerating(false);
    setIsLoading(false);
  }
};


// Handler for sending message on Enter key press in textarea
const handleTextAreaKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) {
    // Send on Enter, new line on Shift+Enter
    e.preventDefault();
    await handleSendMessage();
  }
};



  // Handler for resetting the current chat (starts a new session)
  const handleUserReset = async () => {
    if (isLoading) {
      displayInAppMessage("Please wait for the current response to complete before resetting.");
      return;
    }
    await createNewChatSession(); // This function already handles clearing messages and creating a new session
    setIsChatEmpty(true); // Reset to empty chat state
  };

// Handler for starting a new chat (creates a DB session only if needed)
const handleNewChat = useCallback(async () => {
  // prevent interrupting an in-flight generation
  if (isLoading) {
    displayInAppMessage("Please wait for the current response to complete before starting a new chat.");
    return;
  }

  // If current chat is empty, stay here like ChatGPT
  if (isChatEmpty) {
    console.log("⚠️ Current chat is empty. Staying in the same session.");
    setIsSidebarOpen(false);
    return;
  }

  // Otherwise, create a new session
  setIsLoading(true);
  try {
    const newSessionId = await createNewChatSession();
    if (!newSessionId) {
      displayInAppMessage("Could not create a new chat session. Please try again.");
      return;
    }

    // reset UI and activate the new session
    setMessages([]);
    setEditingMessageId(null);
    setActiveChatSessionId(newSessionId);
    setIsChatEmpty(true);
    setShowFloatingMenu(false);

    // optional: close sidebar so user sees the new (empty) chat area
    setIsSidebarOpen(false);
  } catch (err: any) {
    console.error("handleNewChat error:", err);
    displayInAppMessage("Failed to start a new chat. Check console or try again.");
  } finally {
    setIsLoading(false);
  }
}, [
  isLoading,
  isChatEmpty,
  createNewChatSession,
  displayInAppMessage,
  setIsSidebarOpen,
]);

const handleOpenSidebarProfile = () => {
  setShowSidebarProfileOptions(prev => !prev);
  setShowFloatingProfileOptions(false);
};

const handleOpenFloatingProfile = () => {
  setShowFloatingProfileOptions(prev => !prev);
  setShowSidebarProfileOptions(false);
};

// ✅ Handler for switching to a different chat session (ChatGPT-like + persistent)
const handleSwitchChatSession = useCallback(
  async (sessionId: string) => {
    if (isLoading || !sessionId) return;

    // If already viewing this chat, just close the sidebar
    if (sessionId === activeChatSessionId) {
      setIsSidebarOpen(false);
      return;
    }

    setIsLoading(true);
    console.log("🌀 Switching to chat session:", sessionId);

    try {
      // Get current logged-in user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        displayInAppMessage("You must be logged in to view chats.");
        setIsLoading(false);
        return;
      }

      // Fetch server messages
      const { data: serverMessages, error } = await supabase
        .from("messages")
        .select("id, role, content, created_at, chat_session_id")
        .eq("chat_session_id", sessionId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("❌ Error loading chat:", error.message);
        displayInAppMessage("Failed to load chat. Please try again.");
        setIsLoading(false);
        return;
      }

      // 🧠 Merge server + local messages (for persistence like ChatGPT)
      let cached: ChatMessage[] = [];
      try {
        const raw = localStorage.getItem(`quirra_chat_messages_${sessionId}`);
        if (raw) cached = JSON.parse(raw);
      } catch {
        cached = [];
      }

      const map = new Map<string, ChatMessage>();
      for (const msg of cached) map.set(msg.id, msg);
      for (const msg of serverMessages || []) map.set(msg.id, msg);

      const merged = Array.from(map.values()).sort(
        (a, b) =>
          new Date(a.created_at || "").getTime() -
          new Date(b.created_at || "").getTime()
      );

      // ✅ Update UI
      setMessages([]); // Clear instantly for smooth transition
      requestAnimationFrame(() => {
        setMessages(merged);
        setIsChatEmpty(merged.length === 0);
        setActiveChatSessionId(sessionId);
      });

      // 💾 Save last active session
      localStorage.setItem("quirra_last_active_session", sessionId);

      // 💾 Save merged messages locally
      localStorage.setItem(
        `quirra_chat_messages_${sessionId}`,
        JSON.stringify(merged)
      );

      // Smooth scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (err: any) {
      console.error("❌ Unexpected error while switching chat:", err);
      displayInAppMessage("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
      setIsSidebarOpen(false);
      setShowSessionOptionsForId(null);
    }
  },
  [isLoading, activeChatSessionId, displayInAppMessage]
);

// ✅ Function to rename a chat session (ChatGPT-like, with modal)
const renameChatSession = useCallback(
  async (sessionId: string, currentTitle: string) => {
    if (isLoading) {
      displayInAppMessage(
        "Please wait for the current response to complete before renaming chats."
      );
      return false;
    }

    setModalState({
      isOpen: true,
      type: "prompt",
      title: "Rename Chat Session",
      message: "Enter a new name for this chat session:",
      inputValue: currentTitle,
      onConfirm: async (newTitle?: string) => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        if (!newTitle || !newTitle.trim()) {
          displayInAppMessage("Session title cannot be empty. Rename cancelled.");
          return false;
        }

        setIsLoading(true);
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const userId = session?.user?.id;

          if (!userId) {
            displayInAppMessage("Error: User not logged in. Cannot rename chat session.");
            return false;
          }

          // ✅ Update in DB
          const { error } = await supabase
            .from("chat_sessions")
            .update({ title: newTitle.trim() })
            .eq("id", sessionId)
            .eq("user_id", userId);

          if (error) {
            throw new Error(`Failed to rename session: ${error.message}`);
          }

          // ✅ Update in local state
          setChatSessions((prev) =>
            prev.map((session) =>
              session.id === sessionId ? { ...session, title: newTitle.trim() } : session
            )
          );

          console.log(`✏️ Chat renamed: ${newTitle.trim()}`);
          return true;
        } catch (err: any) {
          console.error("❌ Error renaming chat:", err.message);
          displayInAppMessage(`Failed to rename chat: ${err.message}`);
          return false;
        } finally {
          setIsLoading(false);
          setShowSessionOptionsForId(null);
        }
      },
      onCancel: () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
      },
    });

    return true;
  },
  [isLoading, displayInAppMessage]
);


 // ✅ Handler for deleting a chat session (ChatGPT-like + persistent cleanup)
const handleDeleteChatSession = useCallback(
  async (sessionIdToDelete: string) => {
    if (isLoading) {
      displayInAppMessage(
        "Please wait for the current response to complete before deleting chats."
      );
      return;
    }

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Delete Chat Session",
      message:
        "Are you sure you want to delete this chat session and all its messages? This cannot be undone.",
      onConfirm: async () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        setIsLoading(true);

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const userId = session?.user?.id;

          if (!userId) {
            console.warn("User ID not available, cannot delete chat session.");
            displayInAppMessage(
              "Error: User not logged in. Cannot delete chat session."
            );
            return;
          }

          // 🗑️ Delete from Supabase
          const { error: sessionDeleteError } = await supabase
            .from("chat_sessions")
            .delete()
            .eq("user_id", userId)
            .eq("id", sessionIdToDelete);

          if (sessionDeleteError) {
            throw new Error(
              `Failed to delete chat session: ${sessionDeleteError.message}`
            );
          }

          console.log(`🗑️ Chat session ${sessionIdToDelete} and its messages deleted.`);

          // 🧹 Local cleanup
          localStorage.removeItem(`quirra_chat_messages_${sessionIdToDelete}`);

          // If this was the active chat, also clear the last-active pointer
          const lastActive = localStorage.getItem("quirra_last_active_session");
          if (lastActive === sessionIdToDelete) {
            localStorage.removeItem("quirra_last_active_session");
          }

          // Update local state (remove deleted session)
          setChatSessions((prev) =>
            prev.filter((session) => session.id !== sessionIdToDelete)
          );

          // 🔄 If the deleted session was the active one
          if (activeChatSessionId === sessionIdToDelete) {
            if (chatSessions.length > 1) {
              // Switch to another existing session
              const nextSession =
                chatSessions.find((s) => s.id !== sessionIdToDelete)?.id || null;
              if (nextSession) {
                await handleSwitchChatSession(nextSession);
              } else {
                await createNewChatSession();
              }
            } else {
              // No other sessions → start fresh
              await createNewChatSession();
            }

            setIsChatEmpty(true);

            // 🩵 If all chats are gone, show greeting instantly (no flicker)
            if (chatSessions.length <= 1) setMessages([]);
          }

          console.log("✅ Chat session deleted and UI updated successfully.");
        } catch (err: any) {
          console.error("❌ Error deleting chat session:", err.message);
          displayInAppMessage(`Failed to delete chat session: ${err.message}`);
        } finally {
          setIsLoading(false);
          setShowSessionOptionsForId(null);
        }
      },
      onCancel: () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  },
  [
    isLoading,
    activeChatSessionId,
    chatSessions,
    createNewChatSession,
    handleSwitchChatSession,
    displayInAppMessage,
  ]
);


 // Handler for user logout
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("❌ Error signing out:", error.message);
    displayInAppMessage(`Error signing out: ${error.message}`);
    return;
  }

  toast.success("Signed out successfully!");
  setTimeout(() => router.push("/sign-in"), 1000);
};


  // Function to copy text to clipboard
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      // Use navigator.clipboard.writeText if available (modern browsers, secure contexts)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or environments without clipboard API access
        const textarea = document.createElement('textarea');
        textarea.value = text;
        // Position off-screen to avoid visual disruption
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy'); // Deprecated but widely supported fallback
        document.body.removeChild(textarea);
      }
      setCopiedMessageId(messageId); // Show copy feedback
      setTimeout(() => setCopiedMessageId(null), 2000); // Hide feedback after 2 seconds
    } catch (err) {
      console.error("📋 Copy failed:", err);
      displayInAppMessage("Failed to copy text to clipboard.");
    }
  };

  // Callback for when personality onboarding is completed
  const handleOnboardingComplete = useCallback(async (profile: PersonalityProfile) => {
    setUserPersonalityProfile(profile); // Update local state
    const { data: { session } = { session: null } } = await supabase.auth.getSession(); // Safely destructure
    const userId = session?.user?.id;

    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ personality_profile: profile })
        .eq('id', userId); // Update profile in DB

      if (error) {
        console.error("❌ Failed to save personality profile to DB:", error.message);
        displayInAppMessage("Failed to save your personality profile. You might need to refresh.");
      } else {
        console.log("Personality profile saved to DB.");
      }
    } else {
      console.warn("User ID not available, personality profile not saved to DB.");
    }
    checkAuthAndLoadHistory(); // Reload history and profile to ensure consistency
  }, [checkAuthAndLoadHistory, displayInAppMessage]); // Dependencies for useCallback

  // Custom renderer for links in ReactMarkdown
  const LinkRenderer = ({ node, ...props }: { node?: any; [key: string]: any }) => {
    return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" />;
  };


// Stage files for preview (don’t upload yet)
const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  if (!event.target.files || event.target.files.length === 0) return;

  // Convert FileList → array
  const newFiles = Array.from(event.target.files);

  // Add new files to pending list
  setPendingFiles((prev) => [...prev, ...newFiles]);

  // Reset so same file can be picked again
  event.target.value = "";
};

// Remove a staged file by index
const removePendingFile = (index: number) => {
  setPendingFiles((prev) => prev.filter((_, i) => i !== index));
};

// Handle photo uploads (used by ChatInput)
const handlePhotoChange = (files: FileList) => {
  console.log("📸 Photo(s) selected:", files);
  const newPhotos = Array.from(files);
  setPendingFiles((prev) => [...prev, ...newPhotos]);
};

// While loading initial data (auth, sessions, etc.)
if (isInitialLoading) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="initial-loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed inset-0 flex flex-col items-center justify-center bg-transparent z-50"
      >
        {/* 💫 Smooth pulsing orb */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.6,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 shadow-lg"
        />

        {/* 🩶 Subtle loading text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
          className="text-gray-400 text-sm mt-6 tracking-wide select-none"
        >
          Loading Quirra...
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}

  // Main chat application UI
  return (
    <div className="relative flex min-h-screen text-white overflow-hidden">
      <QuirraBackground isActive={isLoading} />
      {/* Custom Modal Overlay */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-[#1a213a] p-6 rounded-lg shadow-xl border border-gray-800 w-full max-w-md mx-4 relative animate-scaleIn">
            <button
              onClick={() => modalState.onCancel?.()}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <XCircle size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">{modalState.title}</h3>
            <p className="text-gray-300 mb-6">{modalState.message}</p>
            {modalState.type === 'prompt' && (
              <input
                ref={modalInputRef}
                type="text"
                className="w-full bg-[#0A0B1a] text-white rounded-md px-4 py-2 mb-6 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={modalState.inputValue}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    modalState.onConfirm?.((e.target as HTMLInputElement).value);
                  }
                }}
              />
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => modalState.onCancel?.()}
                className="px-5 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => modalState.onConfirm?.(modalState.type === 'prompt' ? modalInputRef.current?.value : undefined)}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                {modalState.type === 'confirm' ? 'Confirm' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

{/* 🧠 Ultra-Compact Side Panel */}
<div
  className={`fixed inset-y-0 left-0 z-[30] flex flex-col items-center overflow-visible bg-[#0B0C15] border-r border-gray-800 transition-all duration-300 ease-in-out ${
    isSidebarOpen ? "w-56" : "w-[56px]"
  }`}
>
  {/* === Intelligent Side Panel Background === */}
  <div className="absolute inset-0 z-0 pointer-events-none">
    <div className="absolute inset-0 bg-[#05060F]/90" />
    <QuirraSidePanelBackground isActive={isLoading} />
  </div>

  {/* === Sidebar Content === */}
  <div className="relative z-10 flex flex-col flex-1 items-center py-4 text-gray-300">

    {/* 🔹 Sidebar Toggle Button (Top) */}
    <button
      onClick={() => setIsSidebarOpen((prev) => !prev)}
      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors mb-5"
      title="Toggle Sidebar"
    >
      <MenuIcon size={18} />
    </button>

    {/* === Action Icons === */}
    <div className="flex flex-col gap-3">
      <button
        onClick={() => {
          handleNewChat();
          setActiveMainView("chat");
        }}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
        title="New Chat"
      >
        <PenSquare size={17} />
      </button>

      <button
        onClick={() => setIsSearchOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
        title="Search"
      >
        <Search size={17} />
      </button>

      <button
        onClick={() => setActiveMainView("library")}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"   
        title="Library"
      >
        <Library size={17} />
      </button>

      <button
          onClick={() => setActiveMainView("journey")}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
        title="My Journey"
     >
       <JourneyIcon state={userJourneyState} />
     </button>
    </div>

    {/* Spacer */}
    <div className="flex-1" />

  
  {/* === Profile Button === */}
<div className="pb-4" ref={floatingUserProfileRef}>
  <ProfileDropdown
    displayUserName={displayUserName}
    dailyTokenUsage={dailyTokenUsage}
    dailyTokenLimit={DAILY_TOKEN_LIMIT_CLIENT}
    isOpen={showFloatingProfileOptions}
    onToggle={() => setShowFloatingProfileOptions(prev => !prev)}
    onSettings={() => {
      setShowSettingsDropdown(true);
      setShowFloatingProfileOptions(false);
      setShowSidebarProfileOptions(false);
    }}
    onSignOut={() => {
      handleLogout();
      setShowFloatingProfileOptions(false);
    }}
    mode="floating"
  />
</div>
</div>
 </div>


 
{/* === QUIRRA SIDEBAR === */}
<div
  className={`fixed inset-y-0 left-0 z-40 transform flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${
    isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full"
  }`}
>
  {/* 🌌 Background */}
  <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#05060E] to-[#0B0C1A]" />
  <div className="absolute inset-y-0 right-[12%] w-[45%] blur-[90px] opacity-[0.15] bg-[linear-gradient(to_left,rgba(0,224,255,0.5),transparent)] pointer-events-none" />
  <div className="absolute right-0 top-0 w-[3px] h-full bg-[linear-gradient(to_left,#00FFFF55,transparent)] blur-[5px] pointer-events-none" />

  {/* === Sidebar Content === */}
  <div className="relative z-10 flex flex-col flex-1 text-gray-300">
  
<div className="p-4 flex items-center justify-between">
  <div onClick={() => handleNewChat()} className="cursor-pointer select-none">
    <img
      src="/logo.png.png"
      alt="Quirra Logo"
      className="h-8 w-auto object-contain"
    />
  </div>

  <button
    onClick={() => setIsSidebarOpen(false)}
    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#1B2238] text-gray-400 hover:text-white transition-colors"
  >
    <MenuIcon size={18} />
  </button>
</div>

   {/* === Actions === */}
<div className="px-3 flex flex-col gap-[2px] mt-2">
  <button
    onClick={() => handleNewChat()}
    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-left text-[12.5px] text-gray-300 hover:bg-[#1C243A] hover:text-white transition-colors"
  >
    <PenSquare size={15} /> New Chat
  </button>
  <button
    onClick={() => setIsSearchOpen(true)}
    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-left text-[12.5px] text-gray-300 hover:bg-[#1C243A] hover:text-white transition-colors"
  >
    <Search size={15} /> Search Chats
  </button>
  <button
    onClick={() => console.log("Open library")}
    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-left text-[12.5px] text-gray-300 hover:bg-[#1C243A] hover:text-white transition-colors"
  >
    <Library size={15} /> Library
  </button>
</div>

{/* === Recent Chats === */}
<div className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-2">
  <h3 className="text-gray-500 text-[10.5px] font-semibold mb-1 px-1 uppercase tracking-wider">
    Recent Chats
  </h3>

  {chatSessions.length > 0 ? (
    <div className="flex flex-col gap-0.5">
      {chatSessions.map((session) => (
        <div key={session.id} className="relative group">
          <button
            onClick={async () => {
              await handleSwitchChatSession(session.id);
              setShowSessionOptionsForId(null);
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 300);
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[12.5px] w-full transition-colors overflow-hidden text-ellipsis whitespace-nowrap ${
              activeChatSessionId === session.id
                ? "bg-[#1C243A] text-gray-200 font-semibold"
                : "text-gray-300 hover:bg-[#1B2238] hover:text-white"
            }`}
          >
            <PenSquare size={15} />
            {session.title || "Untitled Chat"}
          </button>

          {/* Options (Rename/Delete) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSessionOptionsForId(
                showSessionOptionsForId === session.id ? null : session.id
              );
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-[#1B2238] transition-colors"
          >
            <MoreVertical size={15} />
          </button>

          {showSessionOptionsForId === session.id && (
            <div
              ref={sessionOptionsRef}
              className="absolute right-7 top-1/2 -translate-y-1/2 bg-[#0C1224] rounded-md shadow-md z-10 flex flex-col overflow-hidden"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  renameChatSession(session.id, session.title);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-gray-300 hover:bg-[#1B2238] hover:text-white transition-colors"
              >
                <Edit size={13} /> Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChatSession(session.id);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-red-400 hover:bg-[#321010] hover:text-red-300 transition-colors"
              >
                <Eraser size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="px-2 py-1 text-gray-500 text-[12px] italic">No recent chats.</p>
  )}
</div>

{/* === Profile Section === */}
<div className="p-3" ref={sidebarUserProfileRef}>
  <ProfileDropdown
    displayUserName={displayUserName}
    dailyTokenUsage={dailyTokenUsage}
    dailyTokenLimit={DAILY_TOKEN_LIMIT_CLIENT}
    isOpen={showSidebarProfileOptions}
    onToggle={() => {
      setShowSidebarProfileOptions(prev => !prev);
      setShowFloatingProfileOptions(false);
    }}
    onSettings={() => {
      setShowSettingsDropdown(true);
      setShowSidebarProfileOptions(false);
      setShowFloatingProfileOptions(false);
    }}
    onSignOut={() => {
      handleLogout();
      setShowSidebarProfileOptions(false);
    }}
    mode="sidebar"
  />
</div>
</div>
</div>

{showSettingsDropdown && (
  (() => {
    const settingsProps = {
      onClose: () => setShowSettingsDropdown(false),
      onLogout: handleLogout,
      onClearHistory: handleDeleteChatHistory,
      onThemeToggle: toggleTheme,
      currentTheme: theme,
    } as any;
    return <SettingsDropdown {...settingsProps} />;
  })()
)}


      {/* Main Content Area */}
       <main
        className={`relative flex-1 flex flex-col min-h-0 transition-all duration-300 ease-in-out`}
        // Dynamically set marginLeft based on sidebar state
        style={{
          marginLeft: isSidebarOpen ? SIDEBAR_WIDTH : '64px',
        }}
      >  
      {activeMainView === 'journey' ? (
       <JourneyPage />
      ) : activeMainView === 'library' ? (
      <LibraryPage />
      ) : (
        <>
      {/* chat */}
     </>
  )}

      

     {/* 🔍 Quirra Search Dropdown Overlay */}
     <QuirraSearchDropdown
        isOpen={isSearchOpen}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchLoading={searchLoading}
        selectedResult={selectedResult}
        onClose={() => setIsSearchOpen(false)}
        onQueryChange={(v) => setSearchQuery(v)}
        onResultClick={handleResultClick}
        onScroll={onResultsScroll}
    />



{/* 💬 Main Chat Area */}
{activeMainView === "chat" && (
  <motion.div
    layout
    transition={{ type: "spring", stiffness: 200, damping: 25 }}
    className="relative flex flex-col min-h-screen w-full overflow-hidden z-20 bg-transparent"
  >
    {/* When chat is empty */}
    {isChatEmpty ? (
      <div className="flex flex-col items-center justify-center flex-1 px-0 text-center overflow-hidden">
        <motion.h1
          key={randomGreeting}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-2xl md:text-3xl font-semibold mb-12 bg-gradient-to-r from-indigo-400 to-violet-400 text-transparent bg-clip-text"
        >
          {randomGreeting}
        </motion.h1>

        <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 lg:px-0">
          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            isRegenerating={isRegenerating}
            isChatEmpty={isChatEmpty}
            handleSubmit={handleSubmit}
            onFileSelect={(files) =>
              handleFileChange({ target: { files } } as any)
            }
            onQuickAction={(action) => console.log("Quick action:", action)}
            ariaLabel="Message input"
            className="w-full"
          />
        </div>
      </div>
    ) : (
      <>
        {/* Messages container (ChatGPT-like layout) */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 lg:px-0 pb-[150px] scroll-smooth bg-transparent"
          style={{
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="mx-auto w-full max-w-3xl flex flex-col gap-6 pt-6">
            {/* ✅ Updated messages loop */}
            {messages.map((msg) => {
              const convertEmojis = (text: string = "") =>
                String(text)
                  .replace(/:smile:/gi, "😄")
                  .replace(/:laughing:/gi, "😆")
                  .replace(/:thumbsup:/gi, "👍")
                  .replace(/:thumbsdown:/gi, "👎")
                  .replace(/:rocket:/gi, "🚀")
                  .replace(/:fire:/gi, "🔥")
                  .replace(/:heart:/gi, "❤️")
                  .replace(/:check:/gi, "✅")
                  .replace(/:x:/gi, "❌")
                  .replace(/:wave:/gi, "👋")
                  .replace(/:thinking:/gi, "🤔")
                  .replace(/:\)/g, "🙂")
                  .replace(/:-\)/g, "🙂")
                  .replace(/:\(/g, "🙁")
                  .replace(/:-\(/g, "🙁")
                  .replace(/;-\)|;\)/g, "😉");

              const content = convertEmojis(msg.content || "");

              return (
                <motion.div
                  key={msg.id}
                  id={`message-${msg.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className={`w-full flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <MessageToolbar
                    messageId={msg.id}
                    role={msg.role}
                    content={content}
                    onCopy={copyToClipboard}
                    onShare={shareMessage}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    onRegenerate={regenerateResponse}
                    onSaveEdit={(id, newText) => {
                      handleEditMessage(id, newText);
                      setEditingMessageId(null);
                    }}
                    onCancelEdit={() => setEditingMessageId(null)}
                  />
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 🧠 Fixed Input Bar */}
        <motion.div
          animate={{
            opacity: isScrolledUp ? 0.98 : 1,
            y: isScrolledUp ? -2 : 0,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-transparent"
        >
          <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 lg:px-0 py-4 translate-x-[30px]">
            <ChatInput
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              isRegenerating={isRegenerating}
              isChatEmpty={isChatEmpty}
              handleSubmit={handleSubmit}
              onFileSelect={(files) =>
                handleFileChange({ target: { files } } as any)
              }
              onQuickAction={(action) => console.log("Quick action:", action)}
              ariaLabel="Message input"
              className="w-full"
            />
          </div>
        </motion.div>
      </>
    )}
  </motion.div>
)}



      </main>
      <style jsx global>{`
        /* WebKit Scrollbar Styles (for Chrome, Safari, etc.) */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px; /* Set a slim width */
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; /* Make the track transparent */
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.2); /* Semi-transparent gray thumb */
          border-radius: 10px; /* Rounded corners */
          border: 2px solid transparent; /* Creates padding around the thumb */
          background-clip: padding-box; /* Ensures the border doesn't get colored */
          transition: background-color 0.3s ease; /* Smooth transition for hover */
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.4); /* Darker on hover */
        }

        /* Firefox Scrollbar Styles */
        .custom-scrollbar {
          scrollbar-width: thin; /* "auto" or "thin" */
          scrollbar-color: rgba(156, 163, 175, 0.2) transparent; /* thumb and track color */
        }
      `}</style>
    </div>
  );
}