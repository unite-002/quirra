// src/components/PersonalityOnboarding.tsx (UPDATED with Preferred Name)
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/supabase";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PersonalityProfile {
  learning_style: string;
  communication_preference: string;
  feedback_preference: string;
  preferred_name: string | null; // Added preferred_name
}

interface PersonalityOption {
  value: string;
  label: string;
  description: string;
  tone?: string; // Optional tone for preview
  suggestions?: string[]; // Optional suggestions for preview
  icon?: React.ReactNode;
}

// Define the content and tone variations based on personality traits
const personalityData = {
  learning_styles: [
    {
      value: "visual",
      label: "Visual Learner",
      description: "You learn best through diagrams, charts, and visual aids.",
      tone: "🎨 Let's explore your world through images and clear diagrams!",
      suggestions: [
        "Show me a diagram of how photosynthesis works.",
        "Can you explain quantum physics with a flow chart?",
        "Visualize the data for global warming trends.",
      ],
    },
    {
      value: "auditory",
      label: "Auditory Learner",
      description: "You prefer listening to explanations, discussions, and audio resources.",
      tone: "🎧 Get ready to dive into concepts with clear explanations and engaging discussions!",
      suggestions: [
        "Explain the theory of relativity to me aloud.",
        "Tell me about the history of jazz music.",
        "Can you describe the steps to bake a cake?",
      ],
    },
    {
      value: "kinesthetic",
      label: "Kinesthetic Learner",
      description: "You learn by doing, hands-on activities, and practical application.",
      tone: "🖐️ Let's get hands-on and learn by actively doing!",
      suggestions: [
        "Give me a step-by-step guide to building a simple circuit.",
        "Walk me through troubleshooting a Wi-Fi connection.",
        "What are some practical exercises to improve public speaking?",
      ],
    },
    {
      value: "reading_writing",
      label: "Reading/Writing Learner",
      description: "You excel through reading texts, taking notes, and writing summaries.",
      tone: "✍️ Let's break down information through concise summaries and structured notes!",
      suggestions: [
        "Summarize the key points of the American Civil War.",
        "Provide a detailed explanation of blockchain technology.",
        "Outline the main arguments for and against renewable energy.",
      ],
    },
  ],
  communication_preferences: [
    {
      value: "direct",
      label: "Direct & Concise",
      description: "You prefer straightforward answers and getting straight to the point.",
      tone: "🎯 I'll keep it sharp and to the point, just like you like it!",
      suggestions: [
        "What's the capital of France?",
        "How do I fix this error quickly?",
        "Give me the bottom line on this topic.",
      ],
    },
    {
      value: "detailed",
      label: "Detailed & Thorough",
      description: "You appreciate comprehensive explanations and in-depth information.",
      tone: "🔍 Let's explore every detail and uncover deep insights together!",
      suggestions: [
        "Provide a comprehensive overview of the history of artificial intelligence.",
        "Explain the nuances of climate change models.",
        "Can you elaborate on the cultural impact of the Renaissance?",
      ],
    },
    {
      value: "encouraging",
      label: "Supportive & Encouraging",
      description: "You thrive with positive reinforcement and a supportive tone.",
      tone: "🌟 I'm here to support and encourage you every step of the way!",
      suggestions: [
        "I'm feeling stuck on this problem, can you help me get started?",
        "Give me some positive feedback on my progress.",
        "What's a good way to stay motivated when learning new things?",
      ],
    },
    {
      value: "interactive", // Added the missing 4th option
      label: "Interactive & Conversational",
      description: "You prefer a back-and-forth, dynamic conversation style.",
      tone: "💬 Let's have a lively chat and explore ideas together!",
      suggestions: [
        "Ask me questions to help me think.",
        "Let's brainstorm some ideas.",
        "What are your thoughts on this?",
      ],
    },
  ],
  feedback_preferences: [
    {
      value: "constructive",
      label: "Constructive & Specific",
      description: "You prefer precise, actionable feedback focusing on improvement.",
      tone: "🛠️ I'll offer precise and actionable feedback to help you build and grow!",
      suggestions: [
        "How can I improve my essay on ancient Rome?",
        "What specific areas of my coding style need refinement?",
        "Give me targeted advice for my presentation skills.",
      ],
    },
    {
      value: "evaluative",
      label: "Evaluative & Critical",
      description: "You're comfortable with direct assessment of strengths and weaknesses.",
      tone: "⚖️ I'll provide a direct assessment of your work, highlighting both strengths and areas for development.",
      suggestions: [
        "Evaluate my understanding of calculus concepts.",
        "Critique my proposed solution to this engineering problem.",
        "What are the major flaws in this argument?",
      ],
    },
    {
      value: "gentle",
      label: "Gentle & Empathetic",
      description: "You prefer feedback delivered with sensitivity and understanding.",
      tone: "🌸 I'll deliver insights with care and understanding, fostering a gentle learning path.",
      suggestions: [
        "Can you give me feedback on my drawing in a kind way?",
        "I'm nervous about this topic, can you give me feedback softly?",
        "Help me understand where I went wrong without being too harsh.",
      ],
    },
    {
      value: "summary", // Added the missing 4th option
      label: "Summary & Overview",
      description: "You prefer a high-level summary of feedback rather than detailed points.",
      tone: "📝 I'll give you the highlights and main takeaways from your performance.",
      suggestions: [
        "Give me a quick summary of my progress.",
        "What's the overall impression of my work?",
        "Just tell me the main points I need to know.",
      ],
    },
  ],
};

type OnboardingStep = "learning_style" | "communication_preference" | "feedback_preference" | "preferred_name"; // Added "preferred_name" step

export function PersonalityOnboarding({
  onComplete,
  initialProfile,
}: {
  onComplete: (profile: PersonalityProfile) => void;
  initialProfile?: PersonalityProfile | null;
}) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("learning_style");
  const [selectedLearningStyle, setSelectedLearningStyle] = useState<string | null>(null);
  const [selectedCommunicationPreference, setSelectedCommunicationPreference] = useState<string | null>(null);
  const [selectedFeedbackPreference, setSelectedFeedbackPreference] = useState<string | null>(null);
  const [preferredName, setPreferredName] = useState<string>(""); // New state for preferred name
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quirraTone, setQuirraTone] = useState<string>("Welcome to Quirra! Let's get to know each other.");
  const [quirraSuggestions, setQuirraSuggestions] = useState<string[]>([]);

  // Effect to set initial values from initialProfile
  useEffect(() => {
    if (initialProfile) {
      setSelectedLearningStyle(initialProfile.learning_style);
      setSelectedCommunicationPreference(initialProfile.communication_preference);
      setSelectedFeedbackPreference(initialProfile.feedback_preference);
      setPreferredName(initialProfile.preferred_name || ""); // Set initial preferred name
      // No "done" state transition here. Component always starts interactive.
    }
  }, [initialProfile]);

  // Effect to dynamically update Quirra's tone and suggestions based on selections
  useEffect(() => {
    let tone = "Welcome to Quirra! Let's get to know each other.";
    const currentSuggestions: string[] = [];

    if (selectedLearningStyle) {
      const style = personalityData.learning_styles.find(s => s.value === selectedLearningStyle);
      if (style) {
        tone = style.tone || tone; // Use selected tone, fallback to current
        currentSuggestions.push(...style.suggestions || []);
      }
    }
    if (selectedCommunicationPreference) {
      const comm = personalityData.communication_preferences.find(c => c.value === selectedCommunicationPreference);
      if (comm) {
        tone = comm.tone || tone; // Use selected tone, fallback to current
        currentSuggestions.push(...comm.suggestions || []);
      }
    }
    if (selectedFeedbackPreference) {
      const fb = personalityData.feedback_preferences.find(f => f.value === selectedFeedbackPreference);
      if (fb) {
        tone = fb.tone || tone; // Use selected tone, fallback to current
        currentSuggestions.push(...fb.suggestions || []);
      }
    }

    setQuirraTone(tone);
    setQuirraSuggestions(currentSuggestions);
  }, [selectedLearningStyle, selectedCommunicationPreference, selectedFeedbackPreference]);

  // Handle proceeding to the next step or completing the setup
  const handleNextStep = useCallback(async () => {
    setError(null);

    // Input validation for the current step
    if (currentStep === "learning_style" && !selectedLearningStyle) {
      setError("Please select your learning style.");
      return;
    }
    if (currentStep === "communication_preference" && !selectedCommunicationPreference) {
      setError("Please select your communication preference.");
      return;
    }
    if (currentStep === "feedback_preference" && !selectedFeedbackPreference) {
      setError("Please select your feedback preference.");
      return;
    }
    // No specific validation for preferred_name, as it's optional

    // Advance to the next step in the flow
    if (currentStep === "learning_style") {
      setCurrentStep("communication_preference");
    } else if (currentStep === "communication_preference") {
      setCurrentStep("feedback_preference");
    } else if (currentStep === "feedback_preference") {
      setCurrentStep("preferred_name"); // Move to the new preferred name step
    } else if (currentStep === "preferred_name") {
      // Last step: Save profile to Supabase
      setLoading(true);
      try {
        const { data: { user }, error: userSessionError } = await supabase.auth.getUser();
        if (userSessionError || !user) {
          setError("User not authenticated. Please log in again.");
          setLoading(false);
          return;
        }

        const profileToSave: PersonalityProfile = {
          learning_style: selectedLearningStyle!,
          communication_preference: selectedCommunicationPreference!,
          feedback_preference: selectedFeedbackPreference!,
          preferred_name: preferredName.trim() === "" ? null : preferredName.trim(), // Save as null if empty
        };

        // Upsert (insert or update) the personality profile in the 'profiles' table
        const { error: dbError } = await supabase
          .from("profiles")
          .upsert({ id: user.id, personality_profile: profileToSave }, { onConflict: 'id' });

        if (dbError) {
          console.error("Error saving personality profile:", dbError);
          setError(`Failed to save your profile: ${dbError.message}`);
        } else {
          localStorage.setItem('quirra_personality_profile', JSON.stringify(profileToSave));
          onComplete(profileToSave); // Signal parent to redirect
        }
      } catch (err: any) {
        console.error("Unexpected error during profile save:", err);
        setError(`An unexpected error occurred: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  }, [currentStep, selectedLearningStyle, selectedCommunicationPreference, selectedFeedbackPreference, preferredName, onComplete]);

  // Helper function to render options for each step, promoting reusability
  const renderOptions = (options: PersonalityOption[], selectedValue: string | null, onSelect: (value: string) => void) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          className={`p-4 rounded-lg border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 ${
            selectedValue === option.value
              ? "bg-blue-700 border-blue-500 text-white shadow-lg"
              : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-blue-600"
          }`}
        >
          <p className="font-semibold text-lg flex items-center gap-2">
            {option.label}
            {selectedValue === option.value && <CheckCircle2 size={18} className="text-green-300 animate-fadeIn" />}
          </p>
          <p className="text-sm text-gray-400 mt-1">{option.description}</p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-3xl bg-[#0A0B1A] rounded-2xl shadow-xl border border-[#1a213a] p-8 text-white flex flex-col min-h-[500px]">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold text-blue-400 mb-2">Personalize Your Quirra Experience</h2>
        <p className="text-gray-300">Help Quirra understand your unique preferences to provide tailored responses.</p>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        {/* Main content area for each step */}
        <div className="mb-8 min-h-[250px] flex flex-col justify-center">
          {currentStep === "learning_style" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-100">How do you learn best?</h3>
              {renderOptions(personalityData.learning_styles, selectedLearningStyle, setSelectedLearningStyle)}
            </div>
          )}

          {currentStep === "communication_preference" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-100">How do you prefer Quirra to communicate?</h3>
              {renderOptions(personalityData.communication_preferences, selectedCommunicationPreference, setSelectedCommunicationPreference)}
            </div>
          )}

          {currentStep === "feedback_preference" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-100">What kind of feedback do you prefer?</h3>
              {renderOptions(personalityData.feedback_preferences, selectedFeedbackPreference, setSelectedFeedbackPreference)}
            </div>
          )}

          {currentStep === "preferred_name" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-100">What name would you like Quirra to call you? (Optional)</h3>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="e.g., Alex, Dr. Smith, Commander"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-400">If left blank, Quirra will use your username or full name.</p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 bg-red-800 border border-red-600 text-red-100 rounded-lg flex items-center gap-2">
              <XCircle size={20} />
              {error}
            </div>
          )}
        </div>

        {/* Quirra's dynamic tone preview */}
        <div className="bg-[#1a213a] p-4 rounded-lg border border-[#2a304e] flex items-center gap-4 text-gray-300 mt-auto">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
            Q
          </div>
          <p className="italic flex-1">
            {quirraTone}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between w-full mt-8">
          <button
            onClick={() => {
              if (currentStep === "preferred_name") setCurrentStep("feedback_preference");
              else if (currentStep === "feedback_preference") setCurrentStep("communication_preference");
              else if (currentStep === "communication_preference") setCurrentStep("learning_style");
            }}
            disabled={currentStep === "learning_style" || loading}
            className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNextStep}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2 text-lg"
            disabled={loading ||
              (currentStep === "learning_style" && !selectedLearningStyle) ||
              (currentStep === "communication_preference" && !selectedCommunicationPreference) ||
              (currentStep === "feedback_preference" && !selectedFeedbackPreference)
              // Preferred name is optional, so no disable based on its value
            }
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              currentStep === "preferred_name" ? "Save Preferences" : "Next"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}