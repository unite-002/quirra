"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { supabase } from "@/utils/supabase"; // Assuming this is your client-side Supabase setup
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
  MoreVertical,
  XCircle,
  Target, // Icon for Daily Focus
  Smile, // Icon for Mood Logger
  ChevronDown, // Icon for collapsing/expanding
  ChevronUp,   // Icon for collapsing/expanding
} from "lucide-react";
import { PersonalityOnboarding } from "@/components/PersonalityOnboarding";
import DailyFocusInput from '@/components/DailyFocusInput';
import MoodLogger from '@/components/MoodLogger';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// Interface for code block props in ReactMarkdown
interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any; // Node from remark-gfm, can be any
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

// Interface for user personality profile data
interface PersonalityProfile {
  learning_style: string;
  communication_preference: string;
  feedback_preference: string;
  preferred_name: string | null;
}

// Interface for user profile data fetched from Supabase
interface UserProfileData {
  username: string | null;
  full_name: string | null;
  personality_profile: PersonalityProfile | null;
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

// Main Home component for the chat interface
export default function Home() {
  // State variables for chat messages and input
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  // UI state for sidebar, loading indicators, and modals
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For ongoing API requests
  const [isInitialLoading, setIsInitialLoading] = useState(true); // For initial auth/data load
  const [isRegenerating, setIsRegenerating] = useState(false); // For message regeneration state

  // User and personality profile states
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayUserName, setDisplayUserName] = useState<string | null>(null);
  const [chatbotUserName, setChatbotUserName] = useState<string | null>(null);
  const [userPersonalityProfile, setUserPersonalityProfile] = useState<PersonalityProfile | null>(null);

  // Chat session management states
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showSessionOptionsForId, setShowSessionOptionsForId] = useState<string | null>(null); // For chat session dropdown menu

  // Feature-specific UI toggles
  const [showDailyFocusInput, setShowDailyFocusInput] = useState<boolean>(false);
  const [showMoodLogger, setShowMoodLogger] = useState<boolean>(false);
  const [isPersonalizationToolsExpanded, setIsPersonalizationToolsExpanded] = useState<boolean>(false); // State for collapsible section

  // Message interaction states
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null); // For copy-to-clipboard feedback
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null); // For editing user messages

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

  const router = useRouter(); // Next.js router for navigation

  // Effect to close the session options menu when clicking outside
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

  // Effect to focus modal input when it opens
  useEffect(() => {
    if (modalState.isOpen && modalState.type === 'prompt' && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [modalState]);

  // Function to display an in-app message (replaces alert for errors/warnings)
  const displayInAppMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant", // Display as an assistant message
        content: `⚠️ ${content}`,
        id: crypto.randomUUID(),
        chat_session_id: activeChatSessionId || "temp-session-error", // Use current session or a temp ID
        created_at: new Date().toISOString(),
      },
    ]);
  }, [activeChatSessionId]); // Dependency on activeChatSessionId

  // Core Function to Create a New Chat Session (both UI and DB)
  const createNewChatSession = useCallback(async (isInitialLoad = false) => {
    setIsLoading(true);
    setMessages([]); // Clear messages for new chat
    setEditingMessageId(null); // Clear any editing state

    const newSessionId = crypto.randomUUID(); // Generate a new UUID for the session

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
      setActiveChatSessionId(newSessionData.id); // Set the new session as active
      setChatSessions(prev => [newSessionData, ...prev]); // Add to the list of sessions

      console.log(`✅ New conversation session created: ${newSessionData.id}`);
    } catch (error: any) {
      console.error("❌ Error creating new chat session via API:", error.message);
      displayInAppMessage(`Failed to start a new chat session: ${error.message}. You might not be able to save messages.`);
      setActiveChatSessionId(newSessionId); // Still set ID locally even if DB save fails, to allow chat
    } finally {
      setIsLoading(false);
      setIsSidebarOpen(false); // Close sidebar after creating new chat
    }
  }, [displayInAppMessage]); // Dependency on displayInAppMessage

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

    // Fetch user profile data
    let profileData: UserProfileData | null = null;
    const { data: fetchedProfileData, error: profileError } = await supabase
      .from("profiles")
      .select("username, full_name, personality_profile")
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found, which is okay for new users
      console.error("❌ Failed to load user profile:", profileError.message);
    } else if (fetchedProfileData) {
      profileData = fetchedProfileData as UserProfileData;
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
        }
      } else {
        // If no existing sessions, create a new one via API
        await createNewChatSession(true); // Indicate it's an initial load
      }
    }
    setIsInitialLoading(false);
  }, [router, createNewChatSession, displayInAppMessage]); // Dependencies for useCallback

  // Effect to run authentication and history loading on component mount
  useEffect(() => {
    checkAuthAndLoadHistory();
  }, [checkAuthAndLoadHistory]);

  // Effect to scroll to the latest message whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Effect to auto-resize the textarea based on input content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to recalculate
      const lineHeight = parseFloat(getComputedStyle(textareaRef.current).lineHeight);
      const maxHeight = lineHeight * 5; // Max 5 lines
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
      if (textareaRef.current.scrollHeight > maxHeight) {
        textareaRef.current.style.overflowY = 'auto'; // Enable scroll if content exceeds max height
      } else {
        textareaRef.current.style.overflowY = 'hidden'; // Hide scroll otherwise
      }
    }
  }, [input]); // Dependency on input content

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
              // Capture emotion score from the first chunk that contains it
              if (typeof data.emotion_score === 'number' && detectedEmotionScore === undefined) {
                detectedEmotionScore = data.emotion_score;
              }
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

        // Insert the assistant message
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
    e.preventDefault();
    if (!input.trim() || isLoading) { // Prevent empty messages or sending while loading
      return;
    }

    // Ensure an active chat session exists; create one if not
    if (!activeChatSessionId) {
      await createNewChatSession();
      if (!activeChatSessionId) { // Re-check after potential creation
        displayInAppMessage("Failed to start a new chat session. Please try again.");
        return;
      }
    }

    let userMessageToProcess: ChatMessage;
    let currentMessagesForContext: ChatMessage[];
    let originalUserMessageCreatedAt: string | undefined; // To track if we're regenerating

    const assistantPlaceholderId = crypto.randomUUID(); // Unique ID for the streaming assistant message

    if (editingMessageId) {
      // Logic for editing an existing user message
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
        chat_session_id: activeChatSessionId!, // Ensure chat_session_id is set
      };
      originalUserMessageCreatedAt = messages[originalMessageIndex].created_at; // Store timestamp for DB deletion

      // Context for the API call: all messages before the edited one, plus the new edited message
      const messagesBeforeEdit = messages.slice(0, originalMessageIndex);
      currentMessagesForContext = [...messagesBeforeEdit, userMessageToProcess];

      // Update UI immediately: replace original user message, add assistant placeholder
      setMessages([...currentMessagesForContext, { role: "assistant", content: "", id: assistantPlaceholderId, chat_session_id: activeChatSessionId! }]);

      setEditingMessageId(null); // Exit editing mode
      setInput(""); // Clear input field

    } else {
      // Logic for a brand new message
      userMessageToProcess = {
        role: "user",
        content: input.trim(),
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        chat_session_id: activeChatSessionId!, // Ensure chat_session_id is set
      };
      currentMessagesForContext = [...messages, userMessageToProcess]; // Full context includes new message

      // Update UI immediately: add new user message and assistant placeholder
      setMessages((prev) => [
        ...prev,
        userMessageToProcess,
        { role: "assistant", content: "", id: assistantPlaceholderId, chat_session_id: activeChatSessionId! }
      ]);
      setInput(""); // Clear input field
    }

    // Call the API and save to DB
    await sendToApiAndSave(currentMessagesForContext, userMessageToProcess, assistantPlaceholderId, originalUserMessageCreatedAt);
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
  };

  // Handler for starting a new chat (can be called internally or from UI)
  const handleNewChat = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) { // Prevent creating a new session if it's just the initial load
      await createNewChatSession();
    }
  }, [createNewChatSession]); // Dependency on createNewChatSession

  // Handler for switching to a different chat session
  const handleSwitchChatSession = useCallback(async (sessionId: string) => {
    if (isLoading) {
      displayInAppMessage("Please wait for the current response to complete before switching chats.");
      return;
    }
    if (sessionId === activeChatSessionId) { // Do nothing if already on this session
      setIsSidebarOpen(false);
      return;
    }

    setIsLoading(true);
    setMessages([]); // Clear current messages
    setActiveChatSessionId(sessionId); // Set new active session
    setEditingMessageId(null); // Clear editing state

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (userId) {
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("id, role, content, emotion_score, personality_profile, created_at, chat_session_id")
        .eq('user_id', userId)
        .eq('chat_session_id', sessionId)
        .order("created_at", { ascending: true }); // Order by timestamp

      if (fetchError) {
        console.error(`❌ Failed to load history for session ${sessionId}:`, fetchError.message);
        displayInAppMessage("Failed to load chat history. Please try again.");
      } else {
        setMessages(data as ChatMessage[]); // Load messages for the selected session
      }
    } else {
      console.warn("User ID not available, cannot load chat history.");
      displayInAppMessage("Not logged in. Cannot load chat history.");
    }
    setIsLoading(false);
    setIsSidebarOpen(false); // Close sidebar after switching
    setShowSessionOptionsForId(null); // Hide options menu
  }, [isLoading, activeChatSessionId, displayInAppMessage]); // Dependencies for useCallback

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
    router.push("/sign-out"); // Redirect to sign-out page
  };

  // Function to copy text to clipboard
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId); // Show copy feedback
      setTimeout(() => setCopiedMessageId(null), 2000); // Hide feedback after 2 seconds
    } catch (err) {
      console.error("📋 Copy failed", err);
      // Fallback for older browsers or environments where navigator.clipboard is not available
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy'); // Deprecated but widely supported fallback
      document.body.removeChild(textarea);

      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
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

  // Show loading screen during initial authentication and data fetching
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
    <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col">
      {/* Custom Modal Overlay */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]">
          <div className="bg-[#1a213a] p-6 rounded-lg shadow-xl border border-[#2a304e] w-full max-w-md mx-4 relative animate-scaleIn">
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
                className="w-full bg-[#0A0B1A] text-white rounded-md px-4 py-2 mb-6 border border-[#2a304e] focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-[#0A0B1A] border-r border-[#1a213a] z-50 transform ${
          isSidebarOpen ? "translate-x-0 w-full md:w-64" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out flex flex-col`}
      >
        {/* Sidebar Header */}
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

        {/* New Chat Section */}
        <div className="p-2 border-b border-[#1a213a]">
          <button
            onClick={() => handleNewChat(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-gray-300 hover:bg-[#1a213a] hover:text-white transition-colors text-base w-full"
          >
            <MessageSquarePlus size={18} /> New Chat
          </button>
        </div>

        {/* Recent Chats Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 border-b border-[#1a213a]">
          <h3 className="text-gray-400 text-xs font-semibold mb-1 px-2">Recent Chats</h3>
          {chatSessions.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {chatSessions.map((session) => (
                <div key={session.id} className="relative group">
                  <button
                    onClick={() => {
                      handleSwitchChatSession(session.id);
                      setShowSessionOptionsForId(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 pr-10 rounded-lg text-left transition-colors text-sm w-full overflow-hidden text-ellipsis whitespace-nowrap ${
                      activeChatSessionId === session.id
                        ? "bg-blue-700 text-white font-semibold"
                        : "text-gray-300 hover:bg-[#1a213a] hover:text-white"
                    }`}
                  >
                    <MessageSquarePlus size={16} /> {session.title}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent button click from closing sidebar
                      setShowSessionOptionsForId(showSessionOptionsForId === session.id ? null : session.id);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-white hover:bg-[#2a304e] transition-colors"
                    title="More options"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {showSessionOptionsForId === session.id && (
                    <div
                      ref={sessionOptionsRef}
                      className="absolute right-6 top-1/2 -translate-y-1/2 bg-[#2a304e] border border-[#3a405e] rounded-md shadow-lg z-10 flex flex-col overflow-hidden"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          renameChatSession(session.id, session.title);
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-300 hover:bg-blue-600 hover:text-white transition-colors w-full text-left"
                      >
                        <Edit size={12} /> Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChatSession(session.id);
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-400 hover:bg-red-700 hover:text-white transition-colors w-full text-left"
                      >
                        <Eraser size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-3 py-1.5 text-gray-500 text-sm italic">No recent chats.</p>
          )}
        </div>

        {/* Personalization Tools Section (Collapsible) */}
        <div className="p-2 border-b border-[#1a213a] flex flex-col">
          <button
            onClick={() => setIsPersonalizationToolsExpanded(prev => !prev)}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-gray-300 hover:bg-[#1a213a] hover:text-white transition-colors text-base w-full font-semibold"
            aria-expanded={isPersonalizationToolsExpanded}
            aria-controls="personalization-tools-content"
          >
            Personalization Tools
            {isPersonalizationToolsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <div
            id="personalization-tools-content"
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isPersonalizationToolsExpanded ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="flex flex-col gap-1 pl-2 pr-2">
              <button
                onClick={() => {
                  setShowDailyFocusInput(prev => !prev);
                  setShowMoodLogger(false); // Hide mood logger if daily focus is shown
                  setIsSidebarOpen(false); // Close sidebar after clicking
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-gray-300 hover:bg-[#1a213a] hover:text-white transition-colors text-sm w-full"
              >
                <Target size={16} /> Daily Focus
              </button>
              <button
                onClick={() => {
                  setShowMoodLogger(prev => !prev);
                  setShowDailyFocusInput(false); // Hide daily focus if mood logger is shown
                  setIsSidebarOpen(false); // Close sidebar after clicking
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-gray-300 hover:bg-[#1a213a] hover:text-white transition-colors text-sm w-full"
              >
                <Smile size={16} /> Log Mood
              </button>
            </div>
          </div>
        </div>

        {/* User Profile and Settings Section */}
        <div className="p-2 border-t border-[#1a213a] flex flex-col gap-1">
          <h3 className="text-gray-400 text-xs font-semibold mb-1 px-2">Account</h3>
          {displayUserName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a213a] border border-[#2a304e]">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {displayUserName[0]?.toUpperCase()}
              </div>
              <span className="text-gray-200 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                {displayUserName}
              </span>
            </div>
          )}
          {/* Personality profile details removed from here as per user request */}

          <button
            onClick={() => {
              router.push("/settings");
              setIsSidebarOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-gray-300 hover:bg-[#1a213a] hover:text-white transition-colors text-sm w-full"
          >
            <Settings size={16} /> Settings
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-red-400 hover:bg-red-700 hover:text-white transition-colors text-sm mt-1 w-full"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:ml-64" : "ml-0"
        }`}
      >
        {/* Header for main content */}
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
              onClick={handleUserReset}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-sm bg-[#1a213a] text-gray-300 hover:bg-[#2a304e] hover:text-white transition-colors"
              disabled={isLoading}
            >
              <RotateCcw size={18} /> Reset
            </button>
          )}
        </header>

        {/* Daily Focus Input Rendered Conditionally */}
        {showDailyFocusInput && (
          <div className="w-full max-w-4xl mx-auto px-4 py-4 animate-fadeIn">
            <DailyFocusInput />
          </div>
        )}

        {/* Mood Logger Rendered Conditionally */}
        {showMoodLogger && (
          <div className="w-full max-w-4xl mx-auto px-4 py-4 animate-fadeIn">
            <MoodLogger />
          </div>
        )}

        {/* Main chat display area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full flex flex-col custom-scrollbar">
          {/* Welcome message if no messages and no special tools are open */}
          {messages.length === 0 && !showDailyFocusInput && !showMoodLogger ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center text-gray-400 text-3xl font-semibold animate-fadeIn">
              How can I help you today, {chatbotUserName || "User"}?
            </div>
          ) : null}

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
                {/* Emotion score indicator for user messages */}
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

                {/* Conditional rendering for loading state or actual message content */}
                {msg.role === "assistant" && msg.content === "" && (isLoading || isRegenerating) ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="animate-spin text-blue-400" size={20} />
                    <span className="animate-typing-dots text-lg text-gray-300">Quirra is thinking...</span>
                  </div>
                ) : (
                  <Fragment>
                    {/* ReactMarkdown for rendering message content with syntax highlighting */}
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
                                    whiteSpace: 'pre-wrap', // Corrected property
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
                    {/* Action buttons for messages (copy, edit) */}
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
            <div ref={messagesEndRef} /> {/* Scroll target */}
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
                if (e.key === "Enter" && !e.shiftKey) { // Send on Enter, new line on Shift+Enter
                  e.preventDefault();
                  handleSubmit(e as any); // Cast to any to satisfy React.FormEvent type
                }
              }}
              rows={1}
              placeholder={isLoading ? "Quirra is typing..." : editingMessageId ? "Editing message..." : "Ask Quirra anything..."}
              className="w-full resize-none bg-[#1a213a] rounded-xl py-3 pl-4 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-[#2a304e] custom-scrollbar text-base max-h-[120px]"
              disabled={isLoading}
            />
            {(input.trim() || isLoading) && ( // Show send button only if input has text or is loading
              <button
                type="submit"
                className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={!input.trim() || isLoading} // Disable if no text or loading
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
