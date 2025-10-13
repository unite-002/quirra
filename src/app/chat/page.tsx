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

import { PersonalityOnboarding } from "@/components/PersonalityOnboarding";
import DailyFocusInput from '@/components/DailyFocusInput';
import MoodLogger from '@/components/MoodLogger';
import { GoalSetting } from '@/components/GoalSetting'; // Import GoalSetting component
import { ThinkingOrb } from "@/components/ThinkingOrb";
import ChatInput from "@/components/ChatInput";
import QuirraBackground from "@/components/QuirraBackground";
import QuirraSidePanelBackground from "@/components/QuirraSidePanelBackground";
import QuirraSidebarBackground from "@/components/QuirraSidebarBackground";
import QuirraSearchDropdown from "@/components/QuirraSearchDropdown";
import LibraryPage from "@/components/QuirraLibrary/LibraryPage"
import SettingsDropdown from "@/components/SettingsDropdown";
import ProfileDropdown from "@/components/ProfileDropdown";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { motion } from "framer-motion";

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

  // Feature-specific UI toggles
  const [showDailyFocusInput, setShowDailyFocusInput] = useState<boolean>(false);
  const [showMoodLogger, setShowMoodLogger] = useState<boolean>(false);
  const [showGoalSetting, setShowGoalSetting] = useState<boolean>(false); // State for GoalSetting visibility

  // Message interaction states
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null); // For copy-to-clipboard feedback
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null); // For editing user messages
  const [showUserProfileOptions, setShowUserProfileOptions] = useState<boolean>(false); // State for user profile dropdown 

  // 🟢 Track votes for assistant messages
  const [messageVotes, setMessageVotes] = useState<{ [id: string]: "up" | "down" | null }>({});

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

  // Modal state
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
  });

 // ---------- JourneyPage (no Back button) ----------
const JourneyPage: React.FC<{
  state: 'neutral' | 'success' | 'obstacle' | 'goal' | 'curious' | 'sad' | 'motivated' | 'growth';
}> = ({ state }) => {
  const headline =
    state === 'success' ? "You're shining — great progress!" :
    state === 'obstacle' ? "You're facing a block — let's work through it." :
    state === 'goal' ? "Focused on a goal — keep the momentum." :
    state === 'curious' ? "Curious — exploring new ideas." :
    state === 'sad' ? "Feeling low — you're not alone." :
    state === 'motivated' ? "You're fired up — go for it!" :
    state === 'growth' ? "Slow steady growth — well done." :
    "Your Journey";

  const subtext =
    state === 'success' ? "Celebrate the wins. Small rituals help keep momentum." :
    state === 'obstacle' ? "A small plan can turn a block into a step." :
    state === 'goal' ? "Micro-tasks help move the needle. Want a 48-hour plan?" :
    state === 'curious' ? "I can fetch a mini learning plan or resources." :
    state === 'sad' ? "Breathe. Want a grounding exercise or a short prompt?" :
    state === 'motivated' ? "Great energy — convert it into a short action list." :
    state === 'growth' ? "Keep a daily note of progress — it compounds." :
    "Quirra watches your journey and adapts to help.";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#070916] to-[#0c1220] text-white">
      {/* Header inside main canvas (Back button removed) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gray-800/30 flex items-center justify-center">
            <JourneyIcon state={state} size={28} />
          </div>
          <div>
            <div className="text-lg font-semibold">{headline}</div>
            <div className="text-sm text-gray-400">{subtext}</div>
          </div>
        </div>

        {/* intentionally empty right side so header remains balanced */}
        <div className="w-24" />
      </div>

      {/* Canvas area: clean, no inputs */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl p-8 bg-gradient-to-br from-[#071026] to-[#09112b] border border-gray-800 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2">
                <h3 className="text-sm text-gray-300 mb-2">Recent signals</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-[#07172a] border border-gray-800">
                    <div className="text-sm text-gray-300">Latest chat detection</div>
                    <div className="mt-2 text-white font-medium">{headline}</div>
                    <div className="text-xs text-gray-400 mt-1">Detected from your recent messages — Quirra adapts automatically.</div>
                  </div>

                  <div className="p-4 rounded-lg bg-[#07172a] border border-gray-800">
                    <div className="text-sm text-gray-300">Suggestions</div>
                    <div className="mt-2 text-white font-medium">Quick help tailored to this moment</div>
                    <div className="text-xs text-gray-400 mt-1">Example: 3-step plan, calming prompt, or micro-learning list.</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm text-gray-300 mb-2">State</h3>
                <div className="rounded-lg p-4 bg-[#0b1626] border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-gray-900/20 flex items-center justify-center">
                      <JourneyIcon state={state} size={22} />
                    </div>
                    <div>
                      <div className="text-sm text-gray-300">{state.toUpperCase()}</div>
                      <div className="text-xs text-gray-400 mt-1">Real-time — updated from your chats</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-dashed border-gray-700 p-12 text-center text-gray-400">
              <div className="text-lg mb-3">Living world placeholder</div>
              <div className="text-sm">This is the blank canvas for the full Journey experience (timeline, evolving landscape, animations). No inputs here — pure reflection.</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};


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

      if (searchContext === 'chats') {
        // Sessions
        const { data: sessions } = await supabase
          .from("chat_sessions")
          .select("id, title, created_at")
          .ilike("title", `%${query}%`)
          .order("created_at", { ascending: false })
          .range(from, to);

        // Messages
        const { data: messages } = await supabase
          .from("messages")
          .select("id, content, chat_session_id, created_at")
          .ilike("content", `%${query}%`)
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
          });
        });

        // Deduplicate
        const unique: any[] = [];
        const seen = new Set();
        for (const r of mapped) {
          const key = r.kind === "session" ? `s:${r.id}` : `m:${r.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(r);
          }
        }

        setSearchResults(append ? [...searchResults, ...unique] : unique);
        setHasMoreSearchResults(unique.length === SEARCH_PAGE_SIZE);
        setSearchPage(page);
      } else {
        // Docs search placeholder
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
  const handleResultClick = (res: any) => {
  setIsSearchOpen(false);
  setSearchQuery("");
  setSearchResults([]);

  if (res.id) {
    setHighlightedMessageId(res.id);

    const tryScroll = (attempts = 0) => {
      const el = document.getElementById(`message-${res.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (attempts < 5) {
        setTimeout(() => tryScroll(attempts + 1), 300);
      }
    };
    tryScroll();

    // 👇 shorter flash, like ChatGPT 
    setTimeout(() => setHighlightedMessageId(null), 800);
  }
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
    const res = await fetch('/api/chat/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: newSessionId }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to create new chat session on the backend.');
    }

    const newSessionData: ChatSession = await res.json();
    setActiveChatSessionId(newSessionData.id);
    setChatSessions(prev => [newSessionData, ...prev]);
    console.log(`✅ New conversation session created: ${newSessionData.id}`);
    return newSessionData.id;
  } catch (error: any) {
    console.error("❌ Error creating new chat session via API:", error.message);
    displayInAppMessage(`Failed to start a new chat session: ${error.message}. You might not be able to save messages.`);
    setActiveChatSessionId(newSessionId);
    return newSessionId; // still return local ID so chat works
  }
}, [displayInAppMessage]);

  // Authentication and History Loading Function
  const checkAuthAndLoadHistory = useCallback(async () => {
    setIsInitialLoading(true);

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      console.warn("No active session found or error fetching session:", error?.message);
      router.push("/login"); // Redirect to login if no session
      setIsInitialLoading(false);
      return;
    }

    const userId = session.user.id;
    setUserEmail(session.user.email ?? null);

    // Fetch user profile data including daily_token_usage
    let profileData: UserProfileData | null = null;
    const { data: fetchedProfileData, error: profileError } = await supabase
      .from("profiles")
      .select("username, full_name, personality_profile, daily_token_usage") // Include daily_token_usage
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found, which is okay for new users
      console.error("❌ Failed to load user profile:", profileError.message);
    } else if (fetchedProfileData) {
      profileData = fetchedProfileData as UserProfileData;
      setDailyTokenUsage(profileData.daily_token_usage || 0); // Set daily token usage
    }

    // Determine display names based on available profile data
    let resolvedDisplayUserName: string;
    let resolvedChatbotUserName: string;

    if (profileData?.personality_profile?.preferred_name) {
      resolvedDisplayUserName = profileData.personality_profile.preferred_name;
      resolvedChatbotUserName = profileData.personality_profile.preferred_name;
    } else if (profileData?.full_name) {
      resolvedDisplayUserName = profileData.full_name;
      resolvedChatbotUserName = profileData.full_name.split(' ')[0] || "User"; // Use first name if full name exists
    } else if (profileData?.username) {
      resolvedDisplayUserName = profileData.username;
      resolvedChatbotUserName = profileData.username;
    } else {
      const namePart = session.user.email?.split('@')[0] || "User";
      resolvedDisplayUserName = namePart.replace(/[._]/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      resolvedChatbotUserName = resolvedDisplayUserName;
    }

    setDisplayUserName(resolvedDisplayUserName);
    setChatbotUserName(resolvedChatbotUserName);

    // Load personality profile from local storage or fetched profile
    const storedPersonalityProfile = localStorage.getItem('quirra_personality_profile');
    const parsedStoredPersonalityProfile: PersonalityProfile | null = storedPersonalityProfile ? JSON.parse(storedPersonalityProfile) : null;

    let finalPersonalityProfile = profileData?.personality_profile || parsedStoredPersonalityProfile;

    // Update local storage if a profile was fetched from DB
    if (profileData?.personality_profile) {
      localStorage.setItem('quirra_personality_profile', JSON.stringify(profileData.personality_profile));
    } else if (!finalPersonalityProfile) { // Clear local storage if no profile found anywhere
      localStorage.removeItem('quirra_personality_profile');
    }
    setUserPersonalityProfile(finalPersonalityProfile);

    // Load Chat Sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at")
      .eq('user_id', userId)
      .order("created_at", { ascending: false });

    if (sessionsError) {
      console.error("❌ Failed to load chat sessions:", sessionsError.message);
      displayInAppMessage("Failed to load your chat sessions. Please refresh the page.");
    } else {
      const sortedSessions = sessionsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setChatSessions(sortedSessions);

      if (sortedSessions.length > 0) {
        // If sessions exist, load the latest one
        setActiveChatSessionId(sortedSessions[0].id);
        const { data: messagesData, error: fetchMessagesError } = await supabase
          .from("messages")
          .select("id, role, content, emotion_score, personality_profile, created_at, chat_session_id")
          .eq('user_id', userId)
          .eq('chat_session_id', sortedSessions[0].id)
          .order("created_at", { ascending: true });

        if (fetchMessagesError) {
          console.error("❌ Failed to load messages for active session:", fetchMessagesError.message);
          displayInAppMessage("Failed to load messages for your active chat. Please try switching sessions.");
        } else {
          setMessages(messagesData as ChatMessage[]);
          // Set isChatEmpty based on loaded messages
          setIsChatEmpty(messagesData.length === 0);
        }
      } else {
       // No sessions — just show empty state
       setActiveChatSessionId(null);
       setMessages([]);
       setIsChatEmpty(true);
      }
    }
    setIsInitialLoading(false);
  }, [router, createNewChatSession, displayInAppMessage]); // Dependencies for useCallback

  // Effect to run authentication and history loading on component mount
  useEffect(() => {
    checkAuthAndLoadHistory();
  }, [checkAuthAndLoadHistory]);


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
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessageToProcess.content,
          userName: chatbotUserName,
          personalityProfile: userPersonalityProfile,
          messages: currentMessagesForContext.map(msg => ({
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

  // Handler for editing a specific user message
  const handleEditMessage = (messageId: string) => {
    if (isLoading) {
      displayInAppMessage("Please wait for the current response to complete before editing.");
      return;
    }
    const messageToEdit = messages.find(msg => msg.id === messageId && msg.role === 'user');
    if (messageToEdit) {
      setEditingMessageId(messageId); // Set message to be edited
      setInput(messageToEdit.content); // Populate input with message content
      textareaRef.current?.focus(); // Focus the textarea
      // Move cursor to the end of the text
      textareaRef.current?.setSelectionRange(messageToEdit.content.length, messageToEdit.content.length);
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
    setShowDailyFocusInput(false);
    setShowMoodLogger(false);
    setShowGoalSetting(false);
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

 // Handler for switching to a different chat session
const handleSwitchChatSession = useCallback(async (sessionId: string) => {
  if (isLoading) {
    displayInAppMessage("Please wait for the current response to complete before switching chats.");
    return;
  }

  if (sessionId === activeChatSessionId) {
    setIsSidebarOpen(false);
    return;
  }

  try {
    setIsLoading(true);
    setMessages([]);
    setActiveChatSessionId(sessionId);
    setEditingMessageId(null);
    setIsChatEmpty(true);

    setShowDailyFocusInput(false);
    setShowMoodLogger(false);
    setShowGoalSetting(false);

    // Get messages for this session
    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at") // select only what you need
      .eq("chat_session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`❌ Failed to load history for session ${sessionId}:`, error.message);
      displayInAppMessage("Failed to load chat history. Please try again.");
    } else if (data && data.length > 0) {
      console.log("✅ Loaded messages:", data);
      setMessages(data as ChatMessage[]);
      setIsChatEmpty(false);
    } else {
      console.warn("⚠️ No messages found for session:", sessionId);
      setIsChatEmpty(true);
    }
  } catch (err: any) {
    console.error("❌ Unexpected error while switching chat session:", err.message);
    displayInAppMessage("An error occurred while loading this chat. Please try again.");
  } finally {
    setIsLoading(false);
    setIsSidebarOpen(false);
    setShowSessionOptionsForId(null);
  }
}, [isLoading, activeChatSessionId, displayInAppMessage]);


  // Function to rename a chat session (uses custom modal)
  const renameChatSession = useCallback(async (sessionId: string, currentTitle: string) => {
    if (isLoading) {
      displayInAppMessage("Please wait for the current response to complete before renaming chats.");
      return false; // Indicate that modal was not opened
    }

    setModalState({
      isOpen: true,
      type: 'prompt',
      title: 'Rename Chat Session',
      message: 'Enter a new name for this chat session:',
      inputValue: currentTitle,
      onConfirm: async (newTitle?: string) => {
        setModalState(prev => ({ ...prev, isOpen: false })); // Close modal immediately
        if (!newTitle || !newTitle.trim()) {
          displayInAppMessage("Session title cannot be empty. Rename cancelled.");
          return false;
        }

        setIsLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;

          if (!userId) {
            console.warn("User ID not available, cannot rename chat session.");
            displayInAppMessage("Error: User not logged in. Cannot rename chat session.");
            return false;
          }

          const { error } = await supabase
            .from("chat_sessions")
            .update({ title: newTitle.trim() })
            .eq("id", sessionId)
            .eq('user_id', userId); // Ensure user owns the session

          if (error) {
            throw new Error(`Failed to rename session: ${error.message}`);
          }
          console.log(`Session ${sessionId} renamed to "${newTitle.trim()}" successfully.`);

          // Update the title in local state immediately
          setChatSessions(prevSessions =>
            prevSessions.map(sessionItem =>
              sessionItem.id === sessionId ? { ...sessionItem, title: newTitle.trim() } : sessionItem
            )
          );
          return true;
        } catch (err: any) {
          console.error("❌ Error renaming chat session:", err.message);
          displayInAppMessage(`Failed to rename chat session: ${err.message}`);
          return false;
        } finally {
          setIsLoading(false);
          setShowSessionOptionsForId(null); // Close the options menu
        }
      },
      onCancel: () => {
        setModalState(prev => ({ ...prev, isOpen: false })); // Close modal on cancel
      }
    });

    return true; // Indicate that modal was opened
  }, [isLoading, displayInAppMessage]); // Dependencies for useCallback

  // Handler for deleting a chat session (uses custom modal for confirmation)
  const handleDeleteChatSession = useCallback(async (sessionIdToDelete: string) => {
    if (isLoading) {
      displayInAppMessage("Please wait for the current response to complete before deleting chats.");
      return;
    }

    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Chat Session',
      message: 'Are you sure you want to delete this chat session and all its messages? This cannot be undone.',
      onConfirm: async () => {
        setModalState(prev => ({ ...prev, isOpen: false })); // Close modal immediately
        setIsLoading(true);

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;

          if (!userId) {
          console.warn("User ID not available, cannot delete chat session.");
            displayInAppMessage("Error: User not logged in. Cannot delete chat session.");
            return;
          }

          const { error: sessionDeleteError } = await supabase
            .from("chat_sessions")
            .delete()
            .eq('user_id', userId)
            .eq('id', sessionIdToDelete); // Ensure user owns the session

          if (sessionDeleteError) {
            throw new Error(`Failed to delete chat session: ${sessionDeleteError.message}`);
          }

          console.log(`Chat session ${sessionIdToDelete} and its messages deleted.`);

          // Update local state: remove the deleted session
          setChatSessions(prev => prev.filter(session => session.id !== sessionIdToDelete));
          if (activeChatSessionId === sessionIdToDelete) {
            // If the active session was deleted, start a new one
            await createNewChatSession();
            setIsChatEmpty(true); // Reset to empty chat state
          }
        } catch (err: any) {
          console.error("❌ Error deleting chat session:", err.message);
          displayInAppMessage(`Failed to delete chat session: ${err.message}`);
        } finally {
          setIsLoading(false);
          setShowSessionOptionsForId(null); // Hide options menu
        }
      },
      onCancel: () => {
        setModalState(prev => ({ ...prev, isOpen: false })); // Close modal on cancel
      }
    });
  }, [isLoading, activeChatSessionId, createNewChatSession, displayInAppMessage]); // Dependencies for useCallback

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

  // Show loading scconst handleSendMessage = async () => {
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-400" size={48} />
        <p className="text-white text-xl ml-4">Loading your profile and history...</p>
      </div>
    );
  }

  // Show personality onboarding if profile is not set
  if (!userPersonalityProfile) {
    return (
      <div className="min-h-screen bg-[#0A0B1A] flex items-center justify-center p-4">
        <PersonalityOnboarding onComplete={handleOnboardingComplete} />
      </div>
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
    {/* Header */}
    <div className="p-4 flex items-center justify-between">
      <span className="text-[#E6F1FF] text-base font-semibold tracking-wide drop-shadow-[0_0_10px_#00C0FF33]">
        Quirra
      </span>
      <button
        onClick={() => setIsSidebarOpen(false)}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#1B2238] text-gray-400 hover:text-white transition-colors"
      >
        <MenuIcon size={18} />
      </button>
    </div>

   {/* === Actions === */}
<div className="px-3 flex flex-col gap-0.5 mt-2">
  <button
    onClick={() => handleNewChat()}
    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[12.5px] text-gray-300 hover:bg-[#1C243A] hover:text-white transition-colors"
  >
    <PenSquare size={15} /> New Chat
  </button>
  <button
    onClick={() => setIsSearchOpen(true)}
    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[12.5px] text-gray-300 hover:bg-[#1C243A] hover:text-white transition-colors"
  >
    <Search size={15} /> Search Chats
  </button>
  <button
    onClick={() => console.log("Open library")}
    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[12.5px] text-gray-300 hover:bg-[#1C243A] hover:text-white transition-colors"
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
 
 {/* ✅ Detached Global Settings Dropdown */}
{showSettingsDropdown && (
  <SettingsDropdown
    onClose={() => setShowSettingsDropdown(false)}
    onLogout={handleLogout}
    onClearHistory={handleDeleteChatHistory}
    onThemeToggle={toggleTheme}
    currentTheme={theme}
  />
)}

     

      {/* Main Content Area */}
       <main
        className={`relative flex-1 flex flex-col transition-all duration-300 ease-in-out`}
        // Dynamically set marginLeft based on sidebar state
        style={{
          marginLeft: isSidebarOpen ? SIDEBAR_WIDTH : '64px',
        }}
      >  
        {activeMainView === 'journey' ? (
        <JourneyPage state={userJourneyState} />
      ) : activeMainView === 'library' ? (
        <LibraryPage />
      ) : (
        <>
        {/* 👇 keep your entire existing chat UI here */}
        {/* messages list, streaming renderer, input area, overlays, etc. */}
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
        context={searchContext}
        onContextChange={setSearchContext}
     />


        {/* Daily Focus Input Rendered Conditionally with close button */}
        {activeMainView === 'chat' && showDailyFocusInput && (
          <div className="w-full max-w-4xl mx-auto px-4 py-4 animate-fadeIn">
            <div className="relative">
              <DailyFocusInput />
              <button
                onClick={() => setShowDailyFocusInput(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Close Daily Focus"
              >
                <XCircle size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Mood Logger Rendered Conditionally with close button */}
        {activeMainView === 'chat' && showMoodLogger && (
          <div className="w-full max-w-4xl mx-auto px-4 py-4 animate-fadeIn">
            <div className="relative">
              <MoodLogger />
              <button
                onClick={() => setShowMoodLogger(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Close Mood Logger"
              >
                <XCircle size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Goal Setting Rendered Conditionally with close button */}
        {activeMainView === 'chat' && showGoalSetting && ( 
          <div className="w-full max-w-4xl mx-auto px-4 py-4 animate-fadeIn">
            <div className="relative">
              <GoalSetting />
              <button
                onClick={() => setShowGoalSetting(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Close Goal Setting"
              >
                <XCircle size={24} />
              </button>
            </div>
          </div>
        )}

        {/* 🧠 Main Chat Display Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full flex flex-col custom-scrollbar scroll-smooth pb-[100px] min-h-0"
        >
          <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  id={`message-${msg.id}`} // 🔹 add this line
                  className={`group relative px-4 py-3 rounded-xl max-w-[90%] text-base leading-relaxed break-words animate-fadeIn mb-6 transition-colors duration-700 ${
                    msg.role === "user"
                      ? "bg-[#131422] text-white self-end rounded-br-none shadow-sm max-w-[75%]"
                      : "bg-transparent text-gray-200 self-start"
                  } ${highlightedMessageId === msg.id ? "bg-blue-500/20" : ""}`}
                >
                  {/* Loading indicator for assistant */}
                  {msg.role === "assistant" && msg.content === "" && (isLoading || isRegenerating) ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="flex justify-center items-center py-6"
                    >
                      <ThinkingOrb isThinking={true} size={33} />
                    </motion.div>
                  ) : (
                    <Fragment>
                      
                      {/* Message content (rendered above toolbars) */}
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }: CodeProps) {
                            const match = /language-(\w+)/.exec(className || "");
                            const codeText = String(children).replace(/\n$/, "");
                            const copyId = `code-${msg.id}-${match?.[1] || "default"}`;
                            const isCopied = copiedMessageId === copyId;

                            return !inline && match ? (
                              <div className="relative rounded-lg bg-gray-800 font-mono text-sm my-3 shadow border border-gray-700 overflow-hidden">
                                <div className="flex justify-between items-center px-4 py-2 bg-gray-700/70 text-xs text-gray-300 border-b border-gray-700">
                                  <span>{match[1].toUpperCase()}</span>
                                  <button
                                    onClick={() => copyToClipboard(codeText, copyId)}
                                    className="text-gray-400 hover:text-white flex items-center gap-1 p-1 rounded hover:bg-gray-600 transition-colors"
                                    aria-label={isCopied ? "Code copied" : "Copy code"}
                                  >
                                    {isCopied ? (
                                      <Check size={14} className="text-green-400" />
                                    ) : (
                                      <Copy size={14} />
                                    )}
                                    {isCopied ? "Copied!" : "Copy code"}
                                  </button>
                                </div>
                                <div className="p-4 overflow-x-auto custom-scrollbar max-h-96">
                                  <SyntaxHighlighter
                                    style={dark}
                                    language={match[1]}
                                    PreTag="pre"
                                    customStyle={{
                                      background: "transparent",
                                      padding: "0",
                                      margin: "0",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                    }}
                                    wrapLines={true}
                                    {...props}
                                  >
                                    {codeText}
                                  </SyntaxHighlighter>
                                </div>
                              </div>
                            ) : (
                              <code
                                className="bg-gray-700/50 px-1 py-0.5 rounded text-sm font-mono"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          a: ({ node, ...props }) => {
                            const href = props.href || "";
                            // robust image detection that handles query params
                            let isImage = false;
                            try {
                              const u = new URL(href);
                              isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(u.pathname);
                            } catch {
                              isImage = /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(href);
                            }
        
                            if (isImage) {
                              return (
                                <img
                                  src={href}
                                  alt={props.children?.toString() || "uploaded image"}
                                  className="rounded-lg max-w-xs border border-gray-700 mt-2"
                               />
                              );
                            }

                            return (
                              <a
                                {...props}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 underline flex items-center gap-2"
                              >
                                📎 {props.children}
                              </a>
                            );
                          },
                          p: ({ node, ...props }) => (
                            <p
                              {...props}
                              className="mb-2 last:mb-0 text-[15px] leading-relaxed text-gray-200"
                           />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              {...props}
                              className="list-disc list-inside mb-2 last:mb-0 ml-4 text-[15px] leading-relaxed text-gray-200"
                           />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                               {...props}
                               className="list-decimal list-inside mb-2 last:mb-0 ml-4 text-[15px] leading-relaxed"
                           />
                          ),
                          li: ({ node, ...props }) => (
                             <li {...props} className="mb-1 text-[15px] leading-relaxed" />
                          ),
                          h1: ({ node, ...props }) => (
                             <h1 {...props} className="text-xl font-bold mt-4 mb-2 text-white" />
                          ),
                          h2: ({ node, ...props }) => (
                             <h2 {...props} className="text-lg font-semibold mt-3 mb-2 text-white" />
                          ),
                          h3: ({ node, ...props }) => (
                             <h3 {...props} className="text-base font-semibold mt-2 mb-1 text-white" />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote
                              {...props}
                              className="border-l-4 border-gray-500 pl-4 italic text-gray-300 my-2"
                           />
                          ),
                          table: ({ node, ...props }) => (
                            <table
                              {...props}
                              className="table-auto w-full my-2 text-left border-collapse border border-gray-700"
                           />
                          ),
                          th: ({ node, ...props }) => (
                             <th
                             {...props}
                             className="px-4 py-2 border border-gray-700 bg-gray-700 font-semibold"
                           />
                          ),
                          td: ({ node, ...props }) => (
                             <td {...props} className="px-4 py-2 border border-gray-700" />
                          ),
                          strong: ({ node, ...props }) => (
                             <strong {...props} className="font-semibold text-gray-100" />
                          ),
                          em: ({ node, ...props }) => (
                             <em {...props} className="italic text-gray-200" />
                          ),
                        }}
                        remarkPlugins={[remarkGfm]}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {/* User toolbar (below message, right aligned, outside bubble) */}
                     {msg.role === "user" && (
                       <div className="absolute -bottom-6 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                         <IconButton
                           title="Edit message"
                           aria-label="Edit message"
                           onClick={() => handleEditMessage(msg.id)}
                           disabled={isLoading}
                         >
                           <Edit size={18} strokeWidth={1.75} />
                         </IconButton>

                         <IconButton
                           title="Copy message"
                           aria-label="Copy message"
                           onClick={() => copyToClipboard(msg.content, msg.id)}
                         >
                           {copiedMessageId === msg.id ? (
                             <Check size={18} className="text-green-400" />
                           ) : (
                             <Copy size={18} strokeWidth={1.75} />
                           )}
                         </IconButton>
                       </div>
                     )}

                      {/* Assistant toolbar (below message, left aligned) */}
                      {msg.role === "assistant" && (
                        <div className="flex space-x-1 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out">
                          <IconButton title="Copy" aria-label="Copy message" onClick={() => copyToClipboard(msg.content, msg.id)}>
                            <Copy size={18} strokeWidth={1.75} />
                          </IconButton>

                          <IconButton
                            title="Good response"
                            aria-label="Thumbs up"
                            onClick={async () => {
                              try {
                                await supabase.from("feedback").insert({ message_id: msg.id, vote: "up" });
                                setMessageVotes((prev) => ({ ...prev, [msg.id]: "up" }));
                              } catch (err) {
                                console.error("Failed to save feedback:", err);
                              }
                            }}
                            disabled={messageVotes[msg.id] === "up"}
                            className={messageVotes[msg.id] === "up" ? "text-gray-300" : "hover:text-gray-400"}
                          >
                            <ThumbsUp size={18} strokeWidth={1.75} />
                          </IconButton>

                          <IconButton
                            title="Bad response"
                            aria-label="Thumbs down"
                            onClick={async () => {
                              try {
                                await supabase.from("feedback").insert({ message_id: msg.id, vote: "down" });
                                setMessageVotes((prev) => ({ ...prev, [msg.id]: "down" }));
                              } catch (err) {
                                console.error("Failed to save feedback:", err);
                              }
                            }}
                            disabled={messageVotes[msg.id] === "down"}
                            className={messageVotes[msg.id] === "down" ? "text-gray-300" : "hover:text-gray-400"}
                          >
                            <ThumbsDown size={18} strokeWidth={1.75} />
                          </IconButton>

                          <IconButton
                            title="Share"
                            aria-label="Share message"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase
                                  .from("shared_messages")
                                  .insert({ message_id: msg.id, content: msg.content })
                                  .select()
                                  .single();
                                if (error) throw error;

                                const shareUrl = `${window.location.origin}/share/${data.id}`;
                                await navigator.clipboard.writeText(shareUrl);
                                toast.success("Link copied to clipboard!");
                              } catch (err) {
                                toast.error("Failed to share message");
                              }
                            }}
                          >
                            <Upload size={18} strokeWidth={1.75} />
                          </IconButton>

                          <IconButton
                            title="Regenerate"
                            aria-label="Regenerate response"
                            onClick={() => {
                              const lastUserMessage = messages
                                .slice(0, messages.findIndex((m) => m.id === msg.id))
                                .reverse()
                                .find((m) => m.role === "user");

                              if (lastUserMessage) {
                                setInput(lastUserMessage.content);
                                setEditingMessageId(lastUserMessage.id);
                                setIsRegenerating(true);
                                handleSendMessage();
                              }
                            }}
                            disabled={isRegenerating}
                          >
                            {isRegenerating ? <Loader2 size={18} className="animate-spin text-gray-400" /> : <RotateCcw size={18} strokeWidth={1.75} />}
                          </IconButton>
                        </div>
                      )}
                    </Fragment>
                  )}

                  {/* Emotion score badge (absolute) */}
                  {msg.role === "user" && typeof msg.emotion_score === "number" && (
                    <div className="absolute -bottom-2 -left-2 text-sm opacity-90 flex items-center justify-center w-6 h-6 rounded-full bg-gray-700/70 backdrop-blur-sm shadow-md border border-gray-600">
                      {msg.emotion_score > 0.1 ? (
                        <Laugh className="text-green-400" size={16} aria-label="Feeling positive" />
                      ) : msg.emotion_score < -0.1 ? (
                        <Frown className="text-red-400" size={16} aria-label="Feeling negative" />
                      ) : (
                        <Meh className="text-yellow-400" size={16} aria-label="Feeling neutral" />
                      )}
                    </div>
                  )}
                </div> 
              ))} 
             <div ref={messagesEndRef} /> {/* Scroll target */}
          </div>
          
          {/* 🔹 Optional Fade at the bottom */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0B0C1A] to-transparent" />
        </div>  

     {/* 🧠 Greeting + ChatInput (Unified & Centered like ChatGPT) */}
{activeMainView === "chat" && (
  <motion.div
    layout
    transition={{ type: "spring", stiffness: 200, damping: 25 }}
    className={`absolute inset-0 flex flex-col items-center ${
      isChatEmpty ? "justify-center" : "justify-end pb-4"
    } z-20`}
  >
    <div className="w-full max-w-[740px] px-4">
      {isChatEmpty && (
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-2xl md:text-3xl font-semibold text-center mb-14 mt-[-120px] bg-gradient-to-r from-indigo-400 to-violet-400 text-transparent bg-clip-text"
        >
          How can I help you today?
        </motion.h1>
      )}

      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        isRegenerating={isRegenerating}
        isChatEmpty={isChatEmpty}
        handleSubmit={handleSubmit}
        onFileSelect={(files) => handleFileChange({ target: { files } } as any)}
        onSetDailyFocus={() => setShowDailyFocusInput(true)}
        onSetGoal={() => setShowGoalSetting(true)}
        onLogMood={() => setShowMoodLogger(true)}
        onQuickAction={(action) => console.log("Quick action:", action)}
      />
    </div>
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