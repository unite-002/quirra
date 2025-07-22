// src/app/chat/page.tsx
"use client";

import { useState, useEffect, useRef, Fragment } from "react";
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
  // Sparkles, // REMOVED: No longer needed
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { PersonalityOnboarding } from "@/components/PersonalityOnboarding"; // Your updated onboarding component

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

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [userPersonalityProfile, setUserPersonalityProfile] = useState<PersonalityProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // --- Authentication and History Loading ---
  useEffect(() => {
    const checkAuthAndLoadHistory = async () => {
      setIsInitialLoading(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        router.push("/login");
        setIsInitialLoading(false);
        return;
      }

      if (session.user?.email) {
        setUserEmail(session.user.email);
        const namePart = session.user.email.split('@')[0];
        const formattedName = namePart.replace(/[._]/g, ' ').split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        setUserName(formattedName);
      }

      let loadedProfile: PersonalityProfile | null = null;
      const storedProfile = localStorage.getItem('quirra_personality_profile');
      if (storedProfile) {
        try {
          const parsedProfile: PersonalityProfile = JSON.parse(storedProfile);
          loadedProfile = parsedProfile;
        } catch (e) {
          console.error("Failed to parse personality profile from localStorage", e);
          localStorage.removeItem('quirra_personality_profile');
        }
      }

      if (!loadedProfile) {
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("personality_profile")
          .eq('user_id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("❌ Failed to load personality profile from DB:", profileError.message);
        } else if (profileData && profileData.personality_profile) {
          loadedProfile = profileData.personality_profile as PersonalityProfile;
          localStorage.setItem('quirra_personality_profile', JSON.stringify(loadedProfile));
        }
      }
      setUserPersonalityProfile(loadedProfile);

      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("role, content, emotion_score, personality_profile")
        .eq('user_id', session.user.id)
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error("❌ Failed to load history:", fetchError.message);
      } else {
        const chatData = data.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          emotion_score: msg.emotion_score,
          personality_profile: msg.personality_profile,
          id: crypto.randomUUID(), // Assign a new ID for client-side use
        }));
        setMessages(chatData);
      }
      setIsInitialLoading(false);
    };

    checkAuthAndLoadHistory();
  }, [router]);

  // --- Effect to scroll to the bottom of the chat on new messages ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Handler for submitting a new chat message ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !userPersonalityProfile) return;

    setIsLoading(true);

    const userMessage: ChatMessage = { role: "user", content: input, id: crypto.randomUUID() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Add a placeholder for the assistant's response
    setMessages((prev) => [...prev, { role: "assistant", content: "", id: crypto.randomUUID() }]);

    let accumulatedAssistantResponse = "";
    let detectedEmotionScore: number | undefined;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.content,
          userName: userName,
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
              if (typeof data.emotion_score === 'number' && detectedEmotionScore === undefined) {
                detectedEmotionScore = data.emotion_score;
              }
              const deltaContent = data.content || '';
              accumulatedAssistantResponse += deltaContent;

              setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages];
                const lastAssistantMessage = updatedMessages[updatedMessages.length - 1];

                if (lastAssistantMessage && lastAssistantMessage.role === "assistant") {
                  lastAssistantMessage.content = accumulatedAssistantResponse;
                }
                return updatedMessages;
              });
            } catch (e) {
              console.error("Error parsing JSON from stream chunk:", e, "Raw:", jsonStr);
            }
          }
        }
      }

      setMessages((prev) => {
        const updatedMessages = [...prev];
        const lastUserMessageIndex = updatedMessages.findLastIndex(msg => msg.role === 'user');
        if (lastUserMessageIndex !== -1 && detectedEmotionScore !== undefined) {
          updatedMessages[lastUserMessageIndex] = {
            ...updatedMessages[lastUserMessageIndex],
            emotion_score: detectedEmotionScore
          };
        }
        return updatedMessages;
      });

    } catch (err: any) {
      console.error("❌ Chat error:", err.message);
      setMessages((prev) => {
        const updatedMessages = [...prev];
        // Remove the temporary assistant message if it's empty
        if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1]?.content === "" && updatedMessages[updatedMessages.length - 1]?.role === "assistant") {
          updatedMessages.pop();
        }
        updatedMessages.push({
          role: "assistant",
          content: `⚠️ Failed to get a response from Quirra. ${err.message}. Please try again.`,
          id: crypto.randomUUID(),
        });
        return updatedMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handler for resetting the conversation ---
  const handleReset = async () => {
    if (isLoading) return;
    setMessages([]);
    setIsSidebarOpen(false);

    try {
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
    } catch (err: any) {
      console.error("❌ Failed to reset conversation on server:", err.message);
      alert(`Failed to reset conversation: ${err.message}`);
    }
  };

  // --- Handler for starting a new chat (client-side only for now) ---
  const handleNewChat = () => {
    // Before starting a new chat, also trigger a server-side reset
    handleReset();
  };

  // --- Handler for user logout ---
  const handleLogout = async () => {
    router.push("/sign-out");
  };

  // --- Utility function to copy text to clipboard ---
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("📋 Copy failed", err);
      // Optionally, provide a more user-friendly error message
      alert("Failed to copy text. Please try again or copy manually.");
    }
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
        <PersonalityOnboarding onComplete={setUserPersonalityProfile} />
      </div>
    );
  }

  // Custom component for markdown links to open in new tabs
  const LinkRenderer = ({ node, ...props }: { node?: any; [key: string]: any }) => {
    return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" />;
  };

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
          {userEmail && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#1a213a] border border-[#2a304e]">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
                {userName ? userName[0]?.toUpperCase() : userEmail[0]?.toUpperCase()}
              </div>
              <span className="text-gray-200 text-base overflow-hidden text-ellipsis whitespace-nowrap">
                {userName || userEmail}
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
              {/* REMOVED: "Edit Preferences" button, as the "Settings" button below covers this */}
              {/* <button
                onClick={() => setUserPersonalityProfile(null)} // This would trigger the onboarding again
                className="text-blue-400 hover:underline text-xs self-end mt-1"
              >
                Edit Preferences
              </button> */}
            </div>
          )}


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
              How can I help you today?
              {/* REMOVED: Sparkles logo */}
              {/* <Sparkles className="mt-4 text-blue-400 animate-pulse" size={36} /> */}
            </div>
          )}

          <div className="flex flex-col gap-6"> {/* Increased gap for better spacing */}
            {messages.map((msg) => (
              <div
                key={msg.id} // Use msg.id for key
                className={`group relative rounded-xl px-4 py-3 max-w-[90%] text-base break-words animate-fadeIn ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white self-end rounded-br-none"
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
                  <div className="flex items-center gap-2">
                    {/* REPLACED: Sparkles with Loader2 */}
                    <Loader2 className="animate-spin text-blue-400" size={20} />
                    <span className="animate-typing-dots text-lg">Quirra is thinking...</span>
                  </div>
                ) : (
                  <Fragment>
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: CodeProps) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="relative rounded-md bg-gray-800 p-2 font-mono text-sm my-2 overflow-x-auto shadow-inner">
                              <div className="flex justify-between items-center px-2 py-1 bg-gray-700 rounded-t-md text-xs text-gray-300">
                                <span>{match[1].toUpperCase()}</span>
                                <button
                                  onClick={() => copyToClipboard(String(children).replace(/\n$/, ''), `code-${msg.id}`)}
                                  className="text-gray-400 hover:text-white flex items-center gap-1 p-1 rounded hover:bg-gray-600 transition-colors"
                                >
                                  {copiedMessageId === `code-${msg.id}` ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                  {copiedMessageId === `code-${msg.id}` ? 'Copied!' : 'Copy code'}
                                </button>
                              </div>
                              <SyntaxHighlighter
                                style={dark}
                                language={match[1]}
                                PreTag="pre"
                                customStyle={{ background: 'transparent', padding: '10px 0', margin: '0', overflowX: 'auto', maxHeight: '400px' }}
                                wrapLines={true}
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className={`${className} bg-gray-700/50 px-1 py-0.5 rounded text-sm font-mono`} {...props}>
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
                      }}
                      remarkPlugins={[remarkGfm]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {/* Copy button for all messages */}
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
                    {/* "Was this helpful?" feedback for assistant messages */}
                    {msg.role === "assistant" && msg.content !== "" && (
                      <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button className="p-1 rounded-full bg-gray-700 text-gray-300 hover:text-green-400 transition-colors" title="Helpful">
                          <ThumbsUp size={16} />
                        </button>
                        <button className="p-1 rounded-full bg-gray-700 text-gray-300 hover:text-red-400 transition-colors" title="Not helpful">
                          <ThumbsDown size={16} />
                        </button>
                      </div>
                    )}
                  </Fragment>
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
            disabled={isLoading || !userPersonalityProfile}
          />

          {(input.trim() || isLoading) && ( // Show send button if there's input or if loading
            <button
              type="submit"
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors duration-200"
              title="Send message"
              disabled={isLoading || !userPersonalityProfile || !input.trim()} // Disable if no input for actual sending
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          )}
        </form>
      </div>
    </main>
  );
}