"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import {
  MenuIcon,
  Settings,
  MessageSquarePlus,
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
  MoreVertical, // Added for the "..." menu icon
} from "lucide-react";
import { PersonalityOnboarding } from "@/components/PersonalityOnboarding";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  emotion_score?: number;
  personality_profile?: PersonalityProfile;
  id: string;
  created_at?: string;
  chat_session_id: string;
};

interface PersonalityProfile {
  learning_style: string;
  communication_preference: string;
  feedback_preference: string;
  preferred_name: string | null;
}

interface UserProfileData {
  username: string | null;
  full_name: string | null;
  personality_profile: PersonalityProfile | null;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayUserName, setDisplayUserName] = useState<string | null>(null);
  const [chatbotUserName, setChatbotUserName] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [userPersonalityProfile, setUserPersonalityProfile] = useState<PersonalityProfile | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // --- NEW STATE FOR CHAT SESSIONS ---
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showSessionOptionsForId, setShowSessionOptionsForId] = useState<string | null>(null); // State for showing the "..." menu
  // ---------------------------------

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const sessionOptionsRef = useRef<HTMLDivElement>(null); // Ref for closing the options menu

  // Close the session options menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sessionOptionsRef.current && !sessionOptionsRef.current.contains(event.target as Node)) {
        setShowSessionOptionsForId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- Authentication and History Loading Function (Wrapped in useCallback) ---
  const checkAuthAndLoadHistory = useCallback(async () => {
    setIsInitialLoading(true);

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

    let profileData: UserProfileData | null = null;
    const { data: fetchedProfileData, error: profileError } = await supabase
      .from("profiles")
      .select("username, full_name, personality_profile")
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("❌ Failed to load user profile:", profileError.message);
    } else if (fetchedProfileData) {
      profileData = fetchedProfileData as UserProfileData;
    }

    let resolvedDisplayUserName: string;
    let resolvedChatbotUserName: string;

    if (profileData?.personality_profile?.preferred_name) {
      resolvedDisplayUserName = profileData.personality_profile.preferred_name;
      resolvedChatbotUserName = profileData.personality_profile.preferred_name;
    } else if (profileData?.full_name) {
      resolvedDisplayUserName = profileData.full_name;
      resolvedChatbotUserName = profileData.full_name.split(' ')[0];
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

    const storedPersonalityProfile = localStorage.getItem('quirra_personality_profile');
    const parsedStoredPersonalityProfile: PersonalityProfile | null = storedPersonalityProfile ? JSON.parse(storedPersonalityProfile) : null;

    let finalPersonalityProfile = profileData?.personality_profile || parsedStoredPersonalityProfile;

    if (profileData?.personality_profile) {
      localStorage.setItem('quirra_personality_profile', JSON.stringify(profileData.personality_profile));
    } else if (!finalPersonalityProfile) {
      localStorage.removeItem('quirra_personality_profile');
    }
    setUserPersonalityProfile(finalPersonalityProfile);

    // --- NEW: Load Chat Sessions ---
    const { data: sessionsData, error: sessionsError } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at")
      .eq('user_id', userId)
      .order("created_at", { ascending: false });

    if (sessionsError) {
      console.error("❌ Failed to load chat sessions:", sessionsError.message);
    } else {
      const sortedSessions = sessionsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setChatSessions(sortedSessions);

      if (sortedSessions.length > 0) {
        setActiveChatSessionId(sortedSessions[0].id);
        const { data: messagesData, error: fetchMessagesError } = await supabase
          .from("messages")
          .select("id, role, content, emotion_score, personality_profile, created_at, chat_session_id")
          .eq('user_id', userId)
          .eq('chat_session_id', sortedSessions[0].id)
          .order("created_at", { ascending: true });

        if (fetchMessagesError) {
          console.error("❌ Failed to load messages for active session:", fetchMessagesError.message);
        } else {
          setMessages(messagesData as ChatMessage[]);
        }
      } else {
        const newSessionId = crypto.randomUUID();
        setActiveChatSessionId(newSessionId);
        setMessages([]);
      }
    }
    setIsInitialLoading(false);
  }, [router]);

  useEffect(() => {
    checkAuthAndLoadHistory();
  }, [checkAuthAndLoadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const lineHeight = parseFloat(getComputedStyle(textareaRef.current).lineHeight);
      const maxHeight = lineHeight * 5;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
      if (textareaRef.current.scrollHeight > maxHeight) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  const sendToApiAndSave = async (
    currentMessagesForContext: ChatMessage[],
    userMessageToProcess: ChatMessage,
    assistantPlaceholderId: string,
    originalUserMessageCreatedAt?: string
  ) => {
    if (!activeChatSessionId) {
      console.error("No active chat session ID. Cannot send message or save.");
      setIsLoading(false);
      setIsRegenerating(false);
      alert("Error: No active chat session. Please try starting a new chat.");
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
          history: currentMessagesForContext.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          chatSessionId: activeChatSessionId,
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
            }
          }
        }
      }

      const finalUserMessage = {
        ...userMessageToProcess,
        emotion_score: detectedEmotionScore,
        created_at: new Date().toISOString(),
        chat_session_id: activeChatSessionId,
      };

      setMessages((prev) => {
        const updatedMessages = [...prev];
        const userMsgIndex = updatedMessages.findIndex(msg => msg.id === userMessageToProcess.id);
        if (userMsgIndex !== -1) {
          updatedMessages[userMsgIndex] = finalUserMessage;
        }
        return updatedMessages;
      });

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        const sessionExists = chatSessions.some(s => s.id === activeChatSessionId);
        if (!sessionExists) {
          const { error: sessionInsertError } = await supabase
            .from("chat_sessions")
            .insert({
              id: activeChatSessionId,
              user_id: userId,
              title: "New Chat",
              created_at: new Date().toISOString(),
            });
          if (sessionInsertError) {
            console.error("❌ Failed to create chat session:", sessionInsertError.message);
          } else {
            console.log("New chat session created:", activeChatSessionId);
            setChatSessions(prev => [{ id: activeChatSessionId, title: "New Chat", created_at: new Date().toISOString() }, ...prev]);
          }
        }

        if (originalUserMessageCreatedAt) {
          const { error: deleteError } = await supabase
            .from("messages")
            .delete()
            .eq('user_id', userId)
            .eq('chat_session_id', activeChatSessionId)
            .gte('created_at', originalUserMessageCreatedAt);

          if (deleteError) {
            console.error("❌ Failed to clear subsequent messages in DB:", deleteError.message);
          } else {
            console.log("Subsequent messages cleared from database after edit.");
          }
        }

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
          }, { onConflict: 'id' });

        if (userMessageError) {
          console.error("❌ Failed to save/update user message:", userMessageError.message);
        }

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

        if (messages.length === 0 && !originalUserMessageCreatedAt) {
          const generatedTitle = accumulatedAssistantResponse.substring(0, 50).split('\n')[0].trim();
          const newTitle = generatedTitle.length > 0 ? generatedTitle : "New Chat";

          const { error: titleUpdateError } = await supabase
            .from("chat_sessions")
            .update({ title: newTitle })
            .eq('id', activeChatSessionId);

          if (titleUpdateError) {
            console.error("❌ Failed to update chat session title:", titleUpdateError.message);
          } else {
            console.log("Chat session title updated:", newTitle);
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
      setMessages((prev) => {
        const updatedMessages = [...prev];
        const assistantMsgIndex = updatedMessages.findIndex(msg => msg.id === assistantPlaceholderId);
        if (assistantMsgIndex !== -1) {
          updatedMessages[assistantMsgIndex] = {
            ...updatedMessages[assistantMsgIndex],
            content: `⚠️ Failed to get a response from Quirra. Please check your internet connection or try again. (${err.message.substring(0, 100)}...)`,
          };
        } else {
          updatedMessages.push({
            role: "assistant",
            content: `⚠️ An unexpected error occurred. Please try again.`,
            id: crypto.randomUUID(),
            chat_session_id: activeChatSessionId || crypto.randomUUID(),
          });
        }
        return updatedMessages;
      });
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) {
      return;
    }

    if (!activeChatSessionId) {
      const newSessionId = crypto.randomUUID();
      setActiveChatSessionId(newSessionId);
      setChatSessions(prev => [{ id: newSessionId, title: "New Chat", created_at: new Date().toISOString() }, ...prev]);
    }

    let userMessageToProcess: ChatMessage;
    let currentMessagesForContext: ChatMessage[];
    let originalUserMessageCreatedAt: string | undefined;
    const assistantPlaceholderId = crypto.randomUUID();

    if (editingMessageId) {
      setIsRegenerating(true);
      const originalMessageIndex = messages.findIndex(msg => msg.id === editingMessageId && msg.role === 'user');
      if (originalMessageIndex === -1) {
        console.error("Attempted to edit a user message not found.");
        setEditingMessageId(null);
        return;
      }
      userMessageToProcess = {
        ...messages[originalMessageIndex],
        content: input.trim(),
        chat_session_id: activeChatSessionId!,
      };
      originalUserMessageCreatedAt = messages[originalMessageIndex].created_at;

      const messagesBeforeEdit = messages.slice(0, originalMessageIndex);
      currentMessagesForContext = [...messagesBeforeEdit, userMessageToProcess];

      setMessages([...currentMessagesForContext, { role: "assistant", content: "", id: assistantPlaceholderId, chat_session_id: activeChatSessionId! }]);

      setEditingMessageId(null);
      setInput("");

    } else {
      userMessageToProcess = {
        role: "user",
        content: input.trim(),
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        chat_session_id: activeChatSessionId!,
      };
      currentMessagesForContext = [...messages, userMessageToProcess];

      setMessages((prev) => [
        ...prev,
        userMessageToProcess,
        { role: "assistant", content: "", id: assistantPlaceholderId, chat_session_id: activeChatSessionId! }
      ]);
      setInput("");
    }

    await sendToApiAndSave(currentMessagesForContext, userMessageToProcess, assistantPlaceholderId, originalUserMessageCreatedAt);
  };

  const handleEditMessage = (messageId: string) => {
    if (isLoading) {
      alert("Please wait for the current response to complete before editing.");
      return;
    }
    const messageToEdit = messages.find(msg => msg.id === messageId && msg.role === 'user');
    if (messageToEdit) {
      setEditingMessageId(messageId);
      setInput(messageToEdit.content);
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(messageToEdit.content.length, messageToEdit.content.length);
    }
  };

  const handleReset = async () => {
    if (isLoading) {
      alert("Please wait for the current response to complete before resetting.");
      return;
    }
    setMessages([]);
    setIsSidebarOpen(false);
    setEditingMessageId(null);

    const newSessionId = crypto.randomUUID();
    setActiveChatSessionId(newSessionId);
    console.log(`Starting new conversation with session ID: ${newSessionId}`);
  };

  const handleNewChat = () => {
    handleReset();
  };

  const handleSwitchChatSession = useCallback(async (sessionId: string) => {
    if (isLoading) {
      alert("Please wait for the current response to complete before switching chats.");
      return;
    }
    if (sessionId === activeChatSessionId) {
      setIsSidebarOpen(false);
      return;
    }

    setIsLoading(true);
    setMessages([]);
    setActiveChatSessionId(sessionId);
    setEditingMessageId(null); // Clear editing state when switching chats

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (userId) {
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("id, role, content, emotion_score, personality_profile, created_at, chat_session_id")
        .eq('user_id', userId)
        .eq('chat_session_id', sessionId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error(`❌ Failed to load history for session ${sessionId}:`, fetchError.message);
        setMessages([{ role: "assistant", content: "Failed to load chat history. Please try again.", id: crypto.randomUUID(), chat_session_id: sessionId }]);
      } else {
        setMessages(data as ChatMessage[]);
      }
    } else {
      console.warn("User ID not available, cannot load chat history.");
      setMessages([{ role: "assistant", content: "Not logged in. Cannot load chat history.", id: crypto.randomUUID(), chat_session_id: sessionId }]);
    }
    setIsLoading(false);
    setIsSidebarOpen(false);
    setShowSessionOptionsForId(null); // Close any open menu
  }, [isLoading, activeChatSessionId]);

  // --- NEW: Function to Rename a Chat Session ---
  const renameChatSession = useCallback(async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      alert("Session title cannot be empty.");
      return false;
    }
    if (isLoading) {
      alert("Please wait for the current response to complete before renaming chats.");
      return false;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        console.warn("User ID not available, cannot rename chat session.");
        alert("Error: User not logged in. Cannot rename chat session.");
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

      // Update local state
      setChatSessions(prevSessions =>
        prevSessions.map(sessionItem =>
          sessionItem.id === sessionId ? { ...sessionItem, title: newTitle.trim() } : sessionItem
        )
      );
      return true;
    } catch (err: any) {
      console.error("❌ Error renaming chat session:", err.message);
      alert(`Failed to rename chat session: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
      setShowSessionOptionsForId(null); // Close the options menu
    }
  }, [isLoading]);

  // --- MODIFIED: Handler for deleting a chat session (now relies on DB trigger) ---
  const handleDeleteChatSession = useCallback(async (sessionIdToDelete: string) => {
    if (isLoading) {
      alert("Please wait for the current response to complete before deleting chats.");
      return;
    }
    if (!confirm("Are you sure you want to delete this chat session and all its messages? This cannot be undone.")) {
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        console.warn("User ID not available, cannot delete chat session.");
        alert("Error: User not logged in. Cannot delete chat session.");
        return;
      }

      // Thanks to the Supabase trigger, deleting the session record
      // will automatically delete all associated messages.
      const { error: sessionDeleteError } = await supabase
        .from("chat_sessions")
        .delete()
        .eq('user_id', userId)
        .eq('id', sessionIdToDelete);

      if (sessionDeleteError) {
        throw new Error(`Failed to delete chat session: ${sessionDeleteError.message}`);
      }

      console.log(`Chat session ${sessionIdToDelete} and its messages deleted.`);

      // Update UI state
      setChatSessions(prev => prev.filter(session => session.id !== sessionIdToDelete));
      if (activeChatSessionId === sessionIdToDelete) {
        // If the deleted session was the active one, start a new chat
        handleNewChat();
      }
    } catch (err: any) {
      console.error("❌ Error deleting chat session:", err.message);
      alert(`Failed to delete chat session: ${err.message}`);
    } finally {
      setIsLoading(false);
      setShowSessionOptionsForId(null); // Close the options menu
    }
  }, [isLoading, activeChatSessionId, handleNewChat]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("❌ Error signing out:", error.message);
      alert(`Error signing out: ${error.message}`);
      return;
    }
    router.push("/sign-out");
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("📋 Copy failed", err);
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  const handleOnboardingComplete = useCallback(async (profile: PersonalityProfile) => {
    setUserPersonalityProfile(profile);
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
    checkAuthAndLoadHistory();
  }, [checkAuthAndLoadHistory]);

  const LinkRenderer = ({ node, ...props }: { node?: any; [key: string]: any }) => {
    return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" />;
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-400" size={48} />
        <p className="text-white text-xl ml-4">Loading your profile and history...</p>
      </div>
    );
  }

  if (!userPersonalityProfile) {
    return (
      <div className="min-h-screen bg-[#0A0B1A] flex items-center justify-center p-4">
        <PersonalityOnboarding onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-[#0A0B1A] border-r border-[#1a213a] z-50 transform ${
          isSidebarOpen ? "translate-x-0 w-full md:w-64" : "-translate-x-full"
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
          {/* Placeholder for recent chats - NOW DYNAMICALLY LOADED */}
          <div className="mt-4 text-gray-400 text-sm px-4">Recent</div>
          {chatSessions.length > 0 ? (
            <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
              {chatSessions.map((session) => (
                <div key={session.id} className="relative group">
                  <button
                    onClick={() => {
                      handleSwitchChatSession(session.id);
                      setShowSessionOptionsForId(null); // Close options if open
                    }}
                    className={`flex items-center gap-3 px-4 py-2 pr-10 rounded-lg text-left transition-colors text-base w-full overflow-hidden text-ellipsis whitespace-nowrap ${
                      activeChatSessionId === session.id
                        ? "bg-blue-700 text-white font-semibold"
                        : "text-gray-300 hover:bg-[#1a213a] hover:text-white"
                    }`}
                  >
                    <MessageSquarePlus size={20} /> {session.title}
                  </button>
                  {/* "..." More Options Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent `handleSwitchChatSession` from firing
                      setShowSessionOptionsForId(showSessionOptionsForId === session.id ? null : session.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white hover:bg-[#2a304e] transition-colors"
                    title="More options"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Options Dropdown Menu */}
                  {showSessionOptionsForId === session.id && (
                    <div
                      ref={sessionOptionsRef} // Attach ref here
                      className="absolute right-8 top-1/2 -translate-y-1/2 bg-[#2a304e] border border-[#3a405e] rounded-md shadow-lg z-10 flex flex-col overflow-hidden"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newTitle = prompt("Enter new name for the session:", session.title);
                          if (newTitle !== null) { // prompt returns null if cancelled
                            renameChatSession(session.id, newTitle);
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-blue-600 hover:text-white transition-colors w-full text-left"
                      >
                        <Edit size={14} /> Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChatSession(session.id);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-700 hover:text-white transition-colors w-full text-left"
                      >
                        <Eraser size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-2 text-gray-500 text-sm italic">No recent chats.</p>
          )}
        </nav>
        <div className="p-4 border-t border-[#1a213a] flex flex-col gap-2">
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
              {userPersonalityProfile.preferred_name && (
                <p>
                  <b>Call me:</b> <span className="text-gray-200">{userPersonalityProfile.preferred_name}</span>
                </p>
              )}
              <p>
                <b>Learning:</b> <span className="text-gray-200 capitalize">{userPersonalityProfile.learning_style.replace(/_/g, ' ')}</span>
              </p>
              <p>
                <b>Communication:</b> <span className="text-gray-200 capitalize">{userPersonalityProfile.communication_preference.replace(/_/g, ' ')}</span>
              </p>
              <p>
                <b>Feedback:</b> <span className="text-gray-200 capitalize">{userPersonalityProfile.feedback_preference.replace(/_/g, ' ')}</span>
              </p>
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
          isSidebarOpen ? "md:ml-64" : "ml-0"
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

          <div className="flex flex-col gap-8">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`group relative rounded-xl px-4 py-3 max-w-[90%] text-base break-words animate-fadeIn ${
                  msg.role === "user"
                    ? "bg-[#2A304E] text-white self-end rounded-br-none border border-[#3a405e]"
                    : "bg-[#1a213a] text-white self-start rounded-bl-none shadow-md border border-[#2a304e]"
                }`}
              >
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

                {msg.role === "assistant" && msg.content === "" && (isLoading || isRegenerating) ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="animate-spin text-blue-400" size={20} />
                    <span className="animate-typing-dots text-lg text-gray-300">Quirra is thinking...</span>
                  </div>
                ) : (
                  <Fragment>
                    <ReactMarkdown
                      components={{
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
                              <div className="p-4 overflow-x-auto custom-scrollbar max-h-96">
                                <SyntaxHighlighter
                                  style={dark}
                                  language={match[1]}
                                  PreTag="pre"
                                  customStyle={{
                                    background: 'transparent',
                                    padding: '0',
                                    margin: '0',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                  wrapLines={true}
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
                        a: LinkRenderer,
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
                        strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-white" />,
                        em: ({ node, ...props }) => <em {...props} className="italic text-gray-200" />,
                      }}
                      remarkPlugins={[remarkGfm]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {msg.content !== "" && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity duration-200">
                        {msg.role === 'user' && (
                          <button
                            className="p-1 rounded-md bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                            onClick={() => handleEditMessage(msg.id)}
                            title="Edit message"
                            disabled={isLoading}
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        <button
                          className="p-1 rounded-md bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
                          onClick={() => copyToClipboard(msg.content, `msg-${msg.id}`)}
                          title="Copy message"
                        >
                          {copiedMessageId === `msg-${msg.id}` ? (
                            <Check size={16} className="text-green-400" />
                          ) : (
                            <Copy size={16} />
                          )}
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

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 bg-[#0A0B1A] p-4 border-t border-[#1a213a] flex items-center gap-4 w-full max-w-4xl mx-auto shadow-top"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              rows={1}
              placeholder={isLoading ? "Quirra is typing..." : editingMessageId ? "Editing message..." : "Ask Quirra anything..."}
              className="w-full resize-none bg-[#1a213a] rounded-xl py-3 pl-4 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-[#2a304e] custom-scrollbar text-base max-h-[120px]"
              disabled={isLoading}
            />
            {(input.trim() || isLoading) && (
              <button
                type="submit"
                className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                {(isLoading || isRegenerating) ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} className="rotate-0 transition-transform duration-200" />
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}