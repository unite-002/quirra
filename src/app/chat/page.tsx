// src/app/chat/page.tsx
"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { supabase } from "@/utils/supabase"; // Assumes your Supabase client is correctly configured here
import { useRouter } from "next/navigation";
import {
  MenuIcon,
  Settings,
  MessageSquarePlus,
  Copy,
  Send,
  Loader2, // Will be used for thinking indicator
  LogOut,
  Check,
  RotateCcw,
  Laugh,
  Frown,
  Meh, // For neutral emotion
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { PersonalityOnboarding } from "@/components/PersonalityOnboarding"; // Your onboarding component

// For Markdown rendering and Syntax Highlighting
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // For GitHub Flavored Markdown (tables, task lists etc.)
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism'; // A dark theme for code blocks

// Define the specific props for the custom 'code' component passed to ReactMarkdown
interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any;
}

// Define the shape of ChatMessage and PersonalityProfile for type safety
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  emotion_score?: number; // Detected emotion from API for user messages
  personality_profile?: Record<string, string>; // User's profile, saved with user messages (historical)
  id: string; // Add a unique ID for each message for better keying and copying
};

interface PersonalityProfile {
  learning_style: string;
  communication_preference: string;
  feedback_preference: string;
}

// Define a type for the user's general profile data (username, full name)
interface UserProfileData {
  username: string | null;
  full_name: string | null;
  preferred_name?: string | null; // Optional, if you add this specifically to your DB
  personality_profile: PersonalityProfile | null; // Include this here for direct access
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For ongoing chat processing
  const [isInitialLoading, setIsInitialLoading] = useState(true); // For initial page load
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayUserName, setDisplayUserName] = useState<string | null>(null);
  const [chatbotUserName, setChatbotUserName] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [userPersonalityProfile, setUserPersonalityProfile] = useState<PersonalityProfile | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // --- Authentication and History Loading Function (Wrapped in useCallback) ---
  const checkAuthAndLoadHistory = useCallback(async () => {
    setIsInitialLoading(true); // Start initial load indicator

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      console.warn("No active session found or error fetching session:", error?.message);
      router.push("/login");
      setIsInitialLoading(false);
      return;
    }

    const userId = session.user.id;
    setUserEmail(session.user.email ?? null);

    // 1. Fetch User Profile Data (including full_name, username, and personality_profile)
    let profileData: UserProfileData | null = null;
    const { data: fetchedProfileData, error: profileError } = await supabase
      .from("profiles")
      .select("username, full_name, personality_profile")
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found (new user)
      console.error("❌ Failed to load user profile:", profileError.message);
      // Decide if you want to route to an error page or show an inline error.
      // For now, continue with null profile data.
    } else if (fetchedProfileData) {
      profileData = fetchedProfileData as UserProfileData;
    }

    // Determine the name to display and the name for the chatbot
    let resolvedDisplayUserName: string;
    let resolvedChatbotUserName: string;

    if (profileData?.full_name) {
      resolvedDisplayUserName = profileData.full_name;
      resolvedChatbotUserName = profileData.full_name.split(' ')[0]; // Use first name from full_name
    } else if (profileData?.username) {
      resolvedDisplayUserName = profileData.username;
      resolvedChatbotUserName = profileData.username; // Use username as the chatbot name
    } else {
      // Fallback to email part if no full_name or username
      const namePart = session.user.email?.split('@')[0] || "User";
      resolvedDisplayUserName = namePart.replace(/[._]/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      resolvedChatbotUserName = resolvedDisplayUserName;
    }

    setDisplayUserName(resolvedDisplayUserName);
    setChatbotUserName(resolvedChatbotUserName);

    // Set personality profile from DB or localStorage (DB takes precedence)
    const storedPersonalityProfile = localStorage.getItem('quirra_personality_profile');
    const parsedStoredPersonalityProfile: PersonalityProfile | null = storedPersonalityProfile ? JSON.parse(storedPersonalityProfile) : null;

    let finalPersonalityProfile = profileData?.personality_profile || parsedStoredPersonalityProfile;

    // Ensure the personality profile from DB is always authoritative if present
    if (profileData?.personality_profile) {
      localStorage.setItem('quirra_personality_profile', JSON.stringify(profileData.personality_profile));
    } else if (!finalPersonalityProfile) {
      // If no profile from DB and no profile in localStorage, remove any stale item
      localStorage.removeItem('quirra_personality_profile');
    }
    setUserPersonalityProfile(finalPersonalityProfile);


    // 2. Load Chat History
    const { data, error: fetchError } = await supabase
      .from("messages")
      .select("role, content, emotion_score, personality_profile")
      .eq('user_id', userId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("❌ Failed to load history:", fetchError.message);
      // Optionally set an error message in state to display to the user
      // setHistoryError("Failed to load chat history.");
    } else {
      const chatData = data.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        emotion_score: msg.emotion_score,
        personality_profile: msg.personality_profile, // Ensure this matches the `type ChatMessage`
        id: crypto.randomUUID(), // Assign a new ID for client-side use
      }));
      setMessages(chatData);
    }
    setIsInitialLoading(false); // End initial load indicator
  }, [router]); // Dependencies for useCallback

  // --- Authentication and History Loading Effect (calls the function) ---
  useEffect(() => {
    checkAuthAndLoadHistory();
  }, [checkAuthAndLoadHistory]); // `checkAuthAndLoadHistory` is now a dependency

  // --- Effect to scroll to the bottom of the chat on new messages ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Effect to auto-resize textarea ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to recalculate
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]); // Recalculate height whenever input changes

  // --- Handler for submitting a new chat message ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !userPersonalityProfile) {
      console.warn("Submit aborted: input empty, loading, or personality profile missing.");
      return;
    }

    setIsLoading(true);

    const userMessage: ChatMessage = { role: "user", content: input, id: crypto.randomUUID() };
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); // Clear input immediately

    // Add a placeholder for the assistant's response
    const assistantPlaceholderId = crypto.randomUUID();
    setMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantPlaceholderId }]);

    let accumulatedAssistantResponse = "";
    let detectedEmotionScore: number | undefined;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.content,
          userName: chatbotUserName, // Pass the chatbot-specific user name
          personalityProfile: userPersonalityProfile,
        }),
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, Message: ${errorText || 'Unknown error'}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.substring(5).trim();
            if (jsonStr === '[DONE]') {
              done = true;
              break;
            }
            try {
              const data = JSON.parse(jsonStr);
              // Capture emotion score from the first valid `emotion_score` received
              if (typeof data.emotion_score === 'number' && detectedEmotionScore === undefined) {
                detectedEmotionScore = data.emotion_score;
              }
              const deltaContent = data.content || '';
              accumulatedAssistantResponse += deltaContent;

              setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                // Find the placeholder assistant message by its ID
                const assistantMsgIndex = updatedMessages.findIndex(msg => msg.id === assistantPlaceholderId);

                if (assistantMsgIndex !== -1) {
                  updatedMessages[assistantMsgIndex] = {
                    ...updatedMessages[assistantMsgIndex],
                    content: accumulatedAssistantResponse,
                  };
                }
                return updatedMessages;
              });
            } catch (e) {
              console.error("Error parsing JSON from stream chunk:", e, "Raw:", jsonStr);
              // Continue processing next chunks even if one fails to parse
            }
          }
        }
      }

      // After streaming is complete, update the user message with emotion score
      setMessages((prev) => {
        const updatedMessages = [...prev];
        const lastUserMessageIndex = updatedMessages.findLastIndex(msg => msg.role === 'user' && msg.id === userMessage.id); // Ensure we update *this* user message
        if (lastUserMessageIndex !== -1 && detectedEmotionScore !== undefined) {
          updatedMessages[lastUserMessageIndex] = {
            ...updatedMessages[lastUserMessageIndex],
            emotion_score: detectedEmotionScore
          };
        }
        return updatedMessages;
      });

      // --- PERSIST MESSAGES TO SUPABASE ---
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        // Save the user's message (with emotion score)
        const { error: userMessageError } = await supabase
          .from("messages")
          .insert({
            user_id: userId,
            role: "user",
            content: userMessage.content,
            emotion_score: detectedEmotionScore,
            personality_profile: userPersonalityProfile, // Save user's current profile with their message
          });

        if (userMessageError) {
          console.error("❌ Failed to save user message:", userMessageError.message);
        }

        // Save the assistant's response
        const { error: assistantMessageError } = await supabase
          .from("messages")
          .insert({
            user_id: userId,
            role: "assistant",
            content: accumulatedAssistantResponse,
          });

        if (assistantMessageError) {
          console.error("❌ Failed to save assistant message:", assistantMessageError.message);
        }
      } else {
        console.warn("User ID not available, messages not saved to DB.");
      }

    } catch (err: any) {
      console.error("❌ Chat submission error:", err.message);
      setMessages((prev) => {
        const updatedMessages = [...prev];
        // Find and update the placeholder assistant message with the error
        const assistantMsgIndex = updatedMessages.findIndex(msg => msg.id === assistantPlaceholderId);
        if (assistantMsgIndex !== -1) {
          updatedMessages[assistantMsgIndex] = {
            ...updatedMessages[assistantMsgIndex],
            content: `⚠️ Failed to get a response from Quirra. Please check your internet connection or try again. (${err.message.substring(0, 100)}...)`, // Truncate error message
          };
        } else {
          // Fallback if placeholder wasn't found for some reason
          updatedMessages.push({
            role: "assistant",
            content: `⚠️ An unexpected error occurred. Please try again.`,
            id: crypto.randomUUID(),
          });
        }
        return updatedMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handler for resetting the conversation ---
  const handleReset = async () => {
    if (isLoading) {
      alert("Please wait for the current response to complete before resetting.");
      return;
    }
    setMessages([]); // Clear client-side messages immediately
    setIsSidebarOpen(false); // Close sidebar on reset

    try {
      // Send a request to the backend to clear server-side history/context
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`HTTP error! status: ${res.status}, Message: ${errorData.response || 'Unknown error'}`);
      }
      console.log("Conversation history reset on server and client.");

      // Also clear messages from Supabase for the current user
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { error: deleteError } = await supabase
          .from("messages")
          .delete()
          .eq('user_id', session.user.id);

        if (deleteError) {
          console.error("❌ Failed to clear user's messages in DB:", deleteError.message);
          alert(`Failed to clear past messages from database: ${deleteError.message}`);
        } else {
          console.log("User's past messages cleared from database.");
        }
      }

    } catch (err: any) {
      console.error("❌ Failed to reset conversation on server or clear DB:", err.message);
      alert(`Failed to reset conversation: ${err.message}. Messages may not have been fully cleared.`);
    }
  };

  // --- Handler for starting a new chat (client-side and server-side reset) ---
  const handleNewChat = () => {
    handleReset(); // A new chat implicitly means resetting the current one
  };

  // --- Handler for user logout ---
  const handleLogout = async () => {
    // Perform Supabase sign out first for consistency
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("❌ Error signing out:", error.message);
      alert(`Error signing out: ${error.message}`);
      return; // Prevent redirect if sign out failed
    }
    router.push("/sign-out"); // Redirect to a sign-out confirmation or login page
  };

  // --- Utility function to copy text to clipboard ---
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset icon after 2 seconds
    } catch (err) {
      console.error("📋 Copy failed", err);
      // Fallback for older browsers or restricted environments
      alert("Failed to copy text. Please try again or copy manually.");
    }
  };

  // --- Handle Personality Onboarding Completion ---
  const handleOnboardingComplete = useCallback(async (profile: PersonalityProfile) => {
    setUserPersonalityProfile(profile);
    // Update the user's profile in the database with the new personality data
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ personality_profile: profile })
        .eq('id', userId);

      if (error) {
        console.error("❌ Failed to save personality profile to DB:", error.message);
        alert("Failed to save your personality profile. You might need to refresh.");
      } else {
        console.log("Personality profile saved to DB.");
      }
    } else {
      console.warn("User ID not available, personality profile not saved to DB.");
    }

    // After onboarding, re-fetch full profile to get potentially updated user info (like `preferred_name` if added)
    checkAuthAndLoadHistory();
  }, [checkAuthAndLoadHistory]);

  // Custom component for markdown links to open in new tabs
  const LinkRenderer = ({ node, ...props }: { node?: any; [key: string]: any }) => {
    return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" />;
  };

  // --- Conditional Rendering: Full-page loading spinner ---
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-400" size={48} />
        <p className="text-white text-xl ml-4">Loading your profile and history...</p>
      </div>
    );
  }

  // --- Conditional Rendering: Personality Onboarding ---
  if (!userPersonalityProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
        <PersonalityOnboarding onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  // --- Main Chat UI (rendered after initial loading and onboarding are complete) ---
  return (
    <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-[#0A0B1A] border-r border-[#1a213a] z-50 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out flex flex-col`}
      >
        <div className="p-4 flex items-center justify-start border-b border-[#1a213a]">
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
          {displayUserName && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#1a213a] border border-[#2a304e]">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {displayUserName[0]?.toUpperCase()}
              </div>
              <span className="text-gray-200 text-base overflow-hidden text-ellipsis whitespace-nowrap">
                {displayUserName}
              </span>
            </div>
          )}
          {userPersonalityProfile && (
            <div className="flex flex-col gap-1 px-4 py-2 rounded-lg text-left text-gray-400 text-sm">
              <p>
                **Learning:** <span className="text-gray-200 capitalize">{userPersonalityProfile.learning_style.replace(/_/g, ' ')}</span>
              </p>
              <p>
                **Communication:** <span className="text-gray-200 capitalize">{userPersonalityProfile.communication_preference.replace(/_/g, ' ')}</span>
              </p>
              <p>
                **Feedback:** <span className="text-gray-200 capitalize">{userPersonalityProfile.feedback_preference.replace(/_/g, ' ')}</span>
              </p>
            </div>
          )}

          <button
            onClick={() => {
              router.push("/settings");
              setIsSidebarOpen(false); // Close sidebar when navigating
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

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <header className="p-4 flex items-center gap-4 border-b border-[#1a213a] bg-[#0A0B1A] shadow-lg">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-[#1a213a]"
            aria-label="Toggle sidebar"
          >
            <MenuIcon size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Quirra</h1>
          <div className="flex-1"></div>
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

        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full flex flex-col custom-scrollbar">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col justify-center items-center text-center text-gray-400 text-3xl font-semibold animate-fadeIn">
              How can I help you today, {chatbotUserName || "User"}?
            </div>
          )}

          <div className="flex flex-col gap-8"> {/* Increased gap for better spacing between messages */}
            {messages.map((msg) => (
              <div
                key={msg.id} // Use msg.id for key
                className={`group relative rounded-xl px-4 py-3 max-w-[90%] text-base break-words animate-fadeIn ${
                  msg.role === "user"
                    ? "bg-[#2A304E] text-white self-end rounded-br-none border border-[#3a405e]" // Changed user message background
                    : "bg-[#1a213a] text-white self-start rounded-bl-none shadow-md border border-[#2a304e]"
                }`}
              >
                {/* User message emotion cue */}
                {msg.role === "user" && typeof msg.emotion_score === 'number' && (
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

                {/* Assistant thinking indicator */}
                {msg.role === "assistant" && msg.content === "" && isLoading ? (
                  <div className="flex items-center gap-2 py-1"> {/* Added padding for alignment */}
                    <Loader2 className="animate-spin text-blue-400" size={20} />
                    <span className="animate-typing-dots text-lg text-gray-300">Quirra is thinking...</span>
                  </div>
                ) : (
                  <Fragment>
                    <ReactMarkdown
                      components={{
                        // Custom code block renderer for Gemini-like appearance
                        code({ node, inline, className, children, ...props }: CodeProps) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeText = String(children).replace(/\n$/, '');
                          const copyId = `code-${msg.id}-${match?.[1] || 'default'}`;
                          const isCopied = copiedMessageId === copyId;

                          return !inline && match ? (
                            <div className="relative rounded-lg bg-gray-800 font-mono text-sm my-3 shadow-xl border border-gray-700 overflow-hidden">
                              <div className="flex justify-between items-center px-4 py-2 bg-gray-700/70 text-xs text-gray-300 border-b border-gray-700">
                                <span>{match[1].toUpperCase()}</span>
                                <button
                                  onClick={() => copyToClipboard(codeText, copyId)}
                                  className="text-gray-400 hover:text-white flex items-center gap-1 p-1 rounded hover:bg-gray-600 transition-colors"
                                  aria-label={isCopied ? 'Code copied' : 'Copy code'}
                                >
                                  {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                  {isCopied ? 'Copied!' : 'Copy code'}
                                </button>
                              </div>
                              <div className="p-4 overflow-x-auto custom-scrollbar max-h-96"> {/* Added max-h-96 for vertical scroll */}
                                <SyntaxHighlighter
                                  style={dark} // Using the dark theme
                                  language={match[1]}
                                  PreTag="pre"
                                  customStyle={{
                                    background: 'transparent',
                                    padding: '0',
                                    margin: '0',
                                    whiteSpace: 'pre-wrap', // Wrap long lines within the pre tag
                                    wordBreak: 'break-word',
                                  }}
                                  wrapLines={true} // Ensure lines wrap in code blocks
                                  {...props}
                                >
                                  {codeText}
                                </SyntaxHighlighter>
                              </div>
                            </div>
                          ) : (
                            <code className={`${className} bg-gray-700/50 px-1 py-0.5 rounded text-sm font-mono whitespace-pre-wrap break-words`} {...props}>
                              {children}
                            </code>
                          );
                        },
                        a: LinkRenderer, // Use the custom LinkRenderer
                        p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0 text-gray-100 leading-relaxed" />,
                        ul: ({ node, ...props }) => <ul {...props} className="list-disc list-inside mb-2 last:mb-0 ml-4" />,
                        ol: ({ node, ...props }) => <ol {...props} className="list-decimal list-inside mb-2 last:mb-0 ml-4" />,
                        li: ({ node, ...props }) => <li {...props} className="mb-1" />,
                        h1: ({ node, ...props }) => <h1 {...props} className="text-2xl font-bold mt-4 mb-2 text-white" />,
                        h2: ({ node, ...props }) => <h2 {...props} className="text-xl font-bold mt-3 mb-2 text-white" />,
                        h3: ({ node, ...props }) => <h3 {...props} className="text-lg font-semibold mt-2 mb-1 text-white" />,
                        blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-4 border-gray-500 pl-4 italic text-gray-300 my-2" />,
                        table: ({ node, ...props }) => <table {...props} className="table-auto w-full my-2 text-left border-collapse border border-gray-700" />,
                        th: ({ node, ...props }) => <th {...props} className="px-4 py-2 border border-gray-700 bg-gray-700 font-semibold" />,
                        td: ({ node, ...props }) => <td {...props} className="px-4 py-2 border border-gray-700" />,
                        // Adding stronger support for strong/bold and em/italic for general text enhancement
                        strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-white" />,
                        em: ({ node, ...props }) => <em {...props} className="italic text-gray-200" />,
                      }}
                      remarkPlugins={[remarkGfm]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {/* Copy button for all messages */}
                    {msg.content !== "" && ( // Only show copy if content is not empty (i.e., not the thinking state)
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-gray-700 text-gray-300 hover:text-white transition-opacity duration-200"
                        onClick={() => copyToClipboard(msg.content, `msg-${msg.id}`)}
                        title="Copy message"
                      >
                        {copiedMessageId === `msg-${msg.id}` ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    )}
                  </Fragment>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} /> {/* For auto-scrolling */}
          </div>
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 bg-[#0A0B1A] p-4 border-t border-[#1a213a] flex items-center gap-4 w-full max-w-4xl mx-auto shadow-top"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // Prevent new line
                handleSubmit(e as any); // Cast to any to satisfy type for FormEvent
              }
            }}
            rows={1}
            placeholder={isLoading ? "Quirra is typing..." : "Message Quirra..."}
            className="flex-1 resize-none bg-[#1a213a] rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-[#2a304e] custom-scrollbar overflow-y-hidden text-base max-h-40" // Limit height
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>
    </main>
  );
}