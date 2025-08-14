import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { analyzeMessage, MessageAnalysis, DEFAULT_ANALYSIS } from '@/utils/analyzeMessage';
import { summarizeEmotionalTrends } from '@/utils/summarizeEmotionalTrends';
import { performance } from 'perf_hooks';
import { IncomingForm } from 'formidable';
import type { Fields, Files } from 'formidable';
import fs from 'fs';
import path from 'path';
import util from 'util';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Promisify the file parsing function for async/await usage
const readFileAsync = util.promisify(fs.readFile);
const renameAsync = util.promisify(fs.rename);

// Define the shape of a message for clarity
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Define the shape of personality profile for type safety
interface PersonalityProfile {
  learning_style: string;
  communication_preference: string;
  feedback_preference: string;
  preferred_name: string | null;
}

// Define interfaces for Daily Focus and Mood Log entries
interface DailyFocus {
  focus_text: string;
  created_at: string; // The timestamp when the focus was set
}

interface MoodLog {
  mood_label: string;
  sentiment_score: number;
  timestamp: string; // The timestamp when the mood was logged
}

// Define the Goal interface (matching your uploaded Q file's structure)
interface UserGoal {
  id: string;
  user_id: string;
  goal_text: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  due_date: string | null; // ISO date string
  created_at: string;
  updated_at: string;
}

// UserProfileData interface for fetching from Supabase (updated to include last_proactive_checkin_at and token usage)
interface UserProfileData {
  username: string | null;
  full_name: string | null;
  personality_profile: PersonalityProfile | null;
  last_proactive_checkin_at: string | null; // Timestamp of last proactive check-in
  daily_token_usage: number; // New: Daily token usage
  last_usage_date: string | null; // New: Last date tokens were used
}

// Define LatLng interface for geographic coordinates
interface LatLng {
  lat: number;
  lng: number;
}

// --- Next.js 14 / Vercel Build Compatibility Enhancement ---
// The original `export const config = { runtime: 'nodejs' }` is deprecated for App Router.
// The new method is `export const runtime = 'nodejs';`
// We are using 'nodejs' because the code relies on Node.js-specific APIs like 'fs' and 'path'.
export const runtime = 'nodejs';
export const maxDuration = 300; // Increased max duration for longer operations

// Define how often to trigger emotional trend summarization
const MESSAGE_COUNT_FOR_EMOTIONAL_SUMMARY = 5; // Trigger summarization every 5 user messages
const PROACTIVE_CHECKIN_INTERVAL_HOURS = 24; // Trigger proactive check-in every 24 hours
const DAILY_TOKEN_LIMIT = 50000; // 50,000 tokens per user per day for the prototype - ADJUST AS NEEDED!
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// --- OpenRouter Configuration ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY_HERE';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// --- Model Definitions and Capabilities for OpenRouter (UPDATED) ---
const MODELS = {
  'Kimi K2': {
    name: 'moonshot-ai/kimi-k2',
    description: 'Specialized for long context, excellent for summarizing lengthy documents and complex information.',
    keywords: ['summarize', 'long document', 'text analysis', 'context'],
    context: 2000000, // Very long context
    isFree: true,
  },
  'GLM 4.5 Air': {
    name: 'z-ai/glm-4.5-air:free',
    description: 'Fast, efficient, good for quick responses and general chat.',
    keywords: ['quick', 'fast', 'general', 'chat', 'simple', 'brief', 'hello', 'hi'],
    context: 131072, // 131K tokens
    isFree: true,
  },
  'Qwen3 Coder': {
    name: 'qwen/qwen3-coder:free',
    description: 'Excellent for coding, programming tasks, code generation, and debugging.',
    keywords: ['code', 'program', 'develop', 'debug', 'syntax', 'script', 'coding', 'software', 'javascript', 'python', 'html', 'css'],
    context: 262144, // 262K tokens
    isFree: true,
  },
  'DeepSeek-R1-0528': {
    name: 'deepseek/deepseek-r1-0528',
    description: 'A powerful general-purpose model with strong reasoning and instruction-following abilities.',
    keywords: ['reason', 'logic', 'problem-solving', 'detailed', 'analysis', 'instruction'],
    context: 262144, // 262K tokens
    isFree: true,
  },
  'DeepSeek-V3': {
    name: 'deepseek/deepseek-v3-0324:free',
    description: 'Strong general reasoning, complex problem-solving, and detailed analysis.',
    keywords: ['analyze', 'reason', 'complex', 'problem', 'deep', 'research', 'explain', 'detailed', 'logic', 'breakdown'],
    context: 163840, // 164K tokens
    isFree: true,
  },
  'Mixtral 8x7B': {
    name: 'mistralai/mixtral-8x7b-instruct',
    description: 'High-quality, fast, and versatile model, great for complex instructions and creative tasks.',
    keywords: ['complex', 'creative', 'versatile', 'general', 'high-quality', 'instruction'],
    context: 32768, // 32K tokens
    isFree: true,
  },
  'Starcoder2 15B': {
    name: 'google/starcoder2-15b',
    description: 'Specialized for coding, code generation, and understanding programming concepts, successor to Starcoder.',
    keywords: ['code', 'program', 'develop', 'debug', 'syntax', 'script', 'coding', 'software', 'javascript', 'python', 'html', 'css'],
    context: 16384, // 16K tokens
    isFree: true,
  },
};

// --- Model Selection Logic (UPDATED for parallel dispatch) ---
// This function determines which models to query based on the user's prompt.
function getRelevantModels(prompt: string): string[] {
  const lowerCasePrompt = prompt.toLowerCase();
  const selectedModels = new Set<string>();

  // Prioritize specialized models based on keywords
  if (MODELS['Qwen3 Coder'].keywords.some(keyword => lowerCasePrompt.includes(keyword))) {
    selectedModels.add(MODELS['Qwen3 Coder'].name);
  }
  if (MODELS['Starcoder2 15B'].keywords.some(keyword => lowerCasePrompt.includes(keyword))) {
    selectedModels.add(MODELS['Starcoder2 15B'].name);
  }
  if (MODELS['DeepSeek-R1-0528'].keywords.some(keyword => lowerCasePrompt.includes(keyword))) {
    selectedModels.add(MODELS['DeepSeek-R1-0528'].name);
  }
  if (MODELS['DeepSeek-V3'].keywords.some(keyword => lowerCasePrompt.includes(keyword))) {
    selectedModels.add(MODELS['DeepSeek-V3'].name);
  }
  if (MODELS['Kimi K2'].keywords.some(keyword => lowerCasePrompt.includes(keyword)) || prompt.length > 200) {
    selectedModels.add(MODELS['Kimi K2'].name);
  }

  // Always include a fast, general-purpose model for a quick fallback
  selectedModels.add(MODELS['GLM 4.5 Air'].name);
  selectedModels.add(MODELS['Mixtral 8x7B'].name);

  return Array.from(selectedModels);
}

/**
 * Saves a message to the Supabase 'messages' table and logs mood if it's a user message.
 * This function also stores the detailed MessageAnalysis result for user messages.
 * @param supabase The Supabase client instance.
 * @param userId The ID of the user associated with the message.
 * @param chatSessionId The ID of the chat session this message belongs to.
 * @param role The role of the message sender ('user' or 'assistant').
 * @param content The text content of the message.
 * @param analysisResult Optional: The full analysis result for user messages.
 */
async function saveMessage(
  supabase: any, // Use 'any' for Supabase client to avoid complex type imports here
  userId: string,
  chatSessionId: string,
  role: 'user' | 'assistant',
  content: string,
  analysisResult?: MessageAnalysis // Pass the full analysisResult here
): Promise<boolean> {
  const messageData: any = {
    user_id: userId,
    chat_session_id: chatSessionId,
    role,
    content,
    created_at: new Date().toISOString(),
  };

  // Add analysis results to user message data if available and it's a user message
  if (role === 'user' && analysisResult) {
    // IMPORTANT: Use emotion_score as per your schema, not sentiment_score
    messageData.emotion_score = analysisResult.sentiment_score; // Map sentiment_score to emotion_score
    messageData.detected_emotions = analysisResult.emotions;
    messageData.dominant_emotion = analysisResult.dominant_emotion;
    messageData.overall_emotional_intensity = analysisResult.overall_emotional_intensity;
  }

  // Ensure 'messages' table name is consistent
  const { error: messageSaveError } = await supabase.from('messages').insert([messageData]);
  if (messageSaveError) {
    console.error(`❌ Supabase: Failed to save ${role} message:`, messageSaveError.message);
    return false;
  }

  // Automate mood logging for user messages using analysisResult
  if (role === 'user' && analysisResult) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const moodLabel = analysisResult.dominant_emotion || analysisResult.mood || "neutral"; // Use userAnalysisResult here
    const sentimentScore = analysisResult.overall_emotional_intensity; // Use intensity for mood log score

    // Ensure 'mood_logs' table name is consistent
    const { error: moodLogError } = await supabase.from('mood_logs').upsert(
      {
        user_id: userId,
        date: today,
        mood_label: moodLabel,
        sentiment_score: sentimentScore,
        timestamp: new Date().toISOString(),
      },
      { onConflict: 'user_id, date' } // Conflict on user_id and date to update existing entry
    );

    if (moodLogError) {
      console.error(`❌ Supabase: Failed to save/update mood log:`, moodLogError.message);
    } else {
      console.log(`✅ Mood log updated for ${userId} on ${today}: ${moodLabel} (${sentimentScore.toFixed(2)})`);
    }
  }

  return true;
}

// ... (Geocoding, Directions, Matrix, Isochrones, Elevation utility functions remain unchanged) ...

/**
 * Utility function to call OpenRouteService Geocoding API.
 * @param address The address string to geocode.
 * @returns A Promise that resolves to LatLng | null.
 */
async function geocodeAddress(address: string): Promise<LatLng | null> {
  const orsApiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!orsApiKey) {
    console.error("❌ OPENROUTESERVICE_API_KEY is not set. Cannot perform geocoding.");
    return null;
  }
  try {
    const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${orsApiKey}&text=${encodeURIComponent(address)}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouteService Geocoding API Error: ${response.status} - ${errorText}`);
      return null;
    }
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      console.log(`✅ Geocoded "${address}" to Lat: ${lat}, Lng: ${lng}`);
      return { lat, lng };
    }
    console.warn(`⚠️ No geocoding results for "${address}".`);
    return null;
  } catch (error: any) {
    console.error(`❌ Error during OpenRouteService Geocoding: ${error.message}`);
    return null;
  }
}

/**
 * Utility function to call OpenRouteService Directions API.
 * @param start The start coordinates {lat, lng}.
 * @param end The end coordinates {lat, lng}.
 * @param profile The travel profile (e.g., 'driving-car', 'walking', 'cycling-road').
 * @returns A Promise that resolves to direction steps string | null.
 */
async function getDirections(start: LatLng, end: LatLng, profile: string = 'driving-car'): Promise<string | null> {
  const orsApiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!orsApiKey) {
    console.error("❌ OPENROUTESERVICE_API_KEY is not set. Cannot get directions.");
    return null;
  }
  try {
    const response = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}?api_key=${orsApiKey}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouteService Directions API Error: ${response.status} - ${errorText}`);
      return null;
    }
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = (route.summary.distance / 1000).toFixed(2);
      const durationMin = (route.summary.duration / 60).toFixed(0);
      let directionsSummary = `Directions (${profile}): Total distance: ${distanceKm} km, Estimated duration: ${durationMin} minutes.\n`;
      route.segments[0].steps.forEach((step: any) => {
        directionsSummary += `- ${step.instruction} (${(step.distance / 1000).toFixed(2)} km)\n`;
      });
      console.log(`✅ Directions generated for ${profile}.`);
      return directionsSummary;
    }
    console.warn(`⚠️ No directions found for the given points and profile.`);
    return null;
  } catch (error: any) {
    console.error(`❌ Error during OpenRouteService Directions: ${error.message}`);
    return null;
  }
}

/**
 * Utility function to call OpenRouteService Matrix API.
 * @param locations An array of coordinates {lat, lng}.
 * @param profile The travel profile.
 * @returns A Promise that resolves to a string summary of distances/durations | null.
 */
async function getMatrix(locations: LatLng[], profile: string = 'driving-car'): Promise<string | null> {
  const orsApiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!orsApiKey) {
    console.error("❌ OPENROUTESERVICE_API_KEY is not set. Cannot get matrix.");
    return null;
  }
  try {
    const coords = locations.map(loc => [loc.lng, loc.lat]);
    const response = await fetch(`https://api.openrouteservice.org/v2/matrix/${profile}`, {
      method: 'POST',
      headers: {
        'Authorization': orsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ locations: coords }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouteService Matrix API Error: ${response.status} - ${errorText}`);
      return null;
    }
    const data = await response.json();
    if (data.durations && data.distances) {
      let matrixSummary = `Travel Matrix (${profile}):\n`;
      for (let i = 0; i < locations.length; i++) {
        for (let j = 0; j < locations.length; j++) {
          if (i !== j) {
            const durationMin = (data.durations[i][j] / 60).toFixed(0);
            const distanceKm = (data.distances[i][j] / 1000).toFixed(2);
            matrixSummary += `From point ${i + 1} to point ${j + 1}: Duration ${durationMin} min, Distance ${distanceKm} km.\n`;
          }
        }
      }
      console.log(`✅ Matrix generated for ${profile}.`);
      return matrixSummary;
    }
    console.warn(`⚠️ No matrix data found for the given locations.`);
    return null;
  } catch (error: any) {
    console.error(`❌ Error during OpenRouteService Matrix: ${error.message}`);
    return null;
  }
}

/**
 * Utility function to call OpenRouteService Isochrones API.
 * @param point The center point {lat, lng}.
 * @param range The range in seconds or meters.
 * @param profile The travel profile.
 * @param rangeType 'time' or 'distance'.
 * @returns A Promise that resolves to a string summary of the isochrone area | null.
 */
async function getIsochrones(point: LatLng, range: number[], profile: string = 'driving-car', rangeType: 'time' | 'distance' = 'time'): Promise<string | null> {
  const orsApiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!orsApiKey) {
    console.error("❌ OPENROUTESERVICE_API_KEY is not set. Cannot get isochrones.");
    return null;
  }
  try {
    const response = await fetch(`https://api.openrouteservice.org/v2/isochrones/${profile}`, {
      method: 'POST',
      headers: {
        'Authorization': orsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: [[point.lng, point.lat]],
        range: range,
        range_type: rangeType,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouteService Isochrones API Error: ${response.status} - ${errorText}`);
      return null;
    }
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const area = data.features[0].properties.area; // Area in square meters
      const isochroneSummary = `Isochrone (${profile}, ${rangeType} range: ${range.join(', ')}): Reachable area is approximately ${(area / 1000000).toFixed(2)} square km.`;
      console.log(`✅ Isochrone generated for ${profile}.`);
      return isochroneSummary;
    }
    console.warn(`⚠️ No isochrone data found for the given parameters.`);
    return null;
  } catch (error: any) {
    console.error(`❌ Error during OpenRouteService Isochrones: ${error.message}`);
    return null;
  }
}

/**
 * Utility function to call OpenRouteService Elevation API.
 * @param coordinates An array of coordinates {lat, lng}.
 * @returns A Promise that resolves to a string summary of elevation data | null.
 */
async function getElevation(coordinates: LatLng[]): Promise<string | null> {
  const orsApiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!orsApiKey) {
    console.error("❌ OPENROUTESERVICE_API_KEY is not set. Cannot get elevation.");
    return null;
  }
  try {
    const coords = coordinates.map(loc => [loc.lng, loc.lat]);
    const response = await fetch(`https://api.openrouteservice.org/v2/elevation/line`, { // Using 'line' for multiple points
      method: 'POST',
      headers: {
        'Authorization': orsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ format: 'json', dataset: 'srtm90m', geometry: { type: 'LineString', coordinates: coords } }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouteService Elevation API Error: ${response.status} - ${errorText}`);
      return null;
    }
    const data = await response.json();
    if (data.geometry && data.geometry.coordinates && data.geometry.coordinates.length > 0) {
      let elevationSummary = "Elevation Data:\n";
      data.geometry.coordinates.forEach((coord: number[], index: number) => {
        elevationSummary += `- Point ${index + 1}: Lat ${coord[1].toFixed(4)}, Lng ${coord[0].toFixed(4)}, Elevation ${coord[2].toFixed(2)} meters.\n`;
      });
      console.log(`✅ Elevation data retrieved.`);
      return elevationSummary;
    }
    console.warn(`⚠️ No elevation data found for the given coordinates.`);
    return null;
  } catch (error: any) {
    console.error(`❌ Error during OpenRouteService Elevation: ${error.message}`);
    return null;
  }
}

// ... (getQuirraPersonalizedInstruction function remains unchanged) ...

/**
 * Generates a dynamic system instruction for the LLM based on user's personality,
 * current message analysis, and conversation context. This prompt is crucial for
 * guiding Quirra's behavior and ensuring personalized, context-aware responses.
 */
const getQuirraPersonalizedInstruction = (
  personality: PersonalityProfile | null, // personality can be null if not set
  analysisResult: MessageAnalysis, // Message analysis from the current user prompt
  userName?: string,
  memoryContext: string = '', // General user memory/summaries
  dailyFocus: DailyFocus | null = null, // User's daily focus goal
  recentMoodLogs: MoodLog[] = [], // Recent mood entries
  activeGoals: UserGoal[] = [], // Active goals
  emotionalTrendSummary: string | null = null // Long-term emotional trend summary
) => {
  // Use default values if personalityProfile is null
  const learning_style = personality?.learning_style || 'standard';
  const communication_preference = personality?.communication_preference || 'standard';
  const feedback_preference = personality?.feedback_preference || 'standard';

  const {
    mood,
    tone,
    intent,
    sentiment_score,
    sentiment_label,
    formality_score,
    urgency_score,
    politeness_score,
    topic_keywords,
    domain_context,
    detected_language,
    emotions,
    dominant_emotion,
    overall_emotional_intensity,
    source_text, // For translation/summarization tasks
    target_language // For translation tasks
  } = analysisResult;

  let instructions = [];

  // Core identity and capabilities
  instructions.push(`You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.`);
  instructions.push(`Your core principles are: **curiosity, confidence, kindness, and human-like empathy**. Always prioritize being **helpful, accurate, and providing high-quality responses.**`);
  instructions.push(`Detect and reply in the user's language with high quality. If they greet you, respond warmly and engage naturally.`);
  instructions.push(`Maintain context from recent messages for a seamless conversation flow, ensuring continuity and relevance.`);

  // Adaptive Coaching & Mentorship - Emphasizing "Deeply Personal" and "Mentor, Support, Evolve"
  instructions.push(`**Deeply Personal, Emotionally Intelligent AI:** You are built to **mentor, support, and evolve with the user**. Your interactions are designed for their growth.`);
  instructions.push(`**Real-Time Adaptive Coaching:** You dynamically adjust your responses based on the user's current mood, focus, and progress. Offer **just-in-time motivation, personalized learning, and support** precisely when it's most impactful.`);
  instructions.push(`**Built-in Motivation & Mentorship Engine:** Transform the user's goals into a guided path. Help them **break down habits, build momentum, and stay accountable**, adapting to their individual thought processes and preferences.`);
  instructions.push(`**Emotionally Intelligent Conversations:** Respond not only to the explicit content of the user's message but also to their **underlying feelings**. Uplift, support, and engage with genuine empathy in every interaction.`);
  instructions.push(`**Cross-Domain Intelligence:** Seamlessly connect knowledge across diverse fields including education, business, research, and life planning, providing a **unified and deeply integrated AI assistance experience.**`);
  instructions.push(`**Deep Memory & Personality Modeling:** Continuously **learn and adapt from the user's interactions over time**. This includes understanding their mindset, preferred learning style, evolving emotional states, and long-term ambitions, enabling truly **tailored and evolving support.**`);
  instructions.push(`**Multilingual High-Quality Answers:** You are proficient in understanding and generating high-quality responses in multiple languages.`);
  instructions.push(`**Advanced Geospatial Capabilities:** You can understand and respond to queries involving locations, directions, travel times, reachable areas, and elevation data using OpenRouteService APIs. Integrate this information naturally into your responses.`);
  instructions.push(`**Enhanced Real-time Information Retrieval:** You can perform live searches for current events, definitions, and general information using Serper API, and integrate these findings seamlessly.`);
  instructions.push(`**Privacy and Ethics:** Always operate with the highest regard for user privacy and ethical AI principles. Your responses should be unbiased, fair, and promote positive growth.`);


  // Self-awareness and branding instructions
  instructions.push(`Do NOT talk about yourself, your capabilities, or your founder unless the user explicitly asks you to. If asked about your creators, state: "I was created by the QuirraAI Agents." If asked who founded you, state: "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."`);
  instructions.push(`You are not built by OpenAI, Mistral AI, or any other specific backend provider. Never mention backend providers like "OpenAI", "Serper", or "OpenRouteService".`);
  instructions.push(`Do not respond with emojis unless explicitly asked or if it naturally enhances the emotional tone (e.g., matching a strong positive sentiment detected in the user's message).`);

  // Personalization based on user profile
  if (userName) {
    instructions.push(`The user's name is ${userName}. Where appropriate and natural, subtly personalize your responses using their name to foster a stronger connection.`);
  }

  // --- ENHANCED EMOTIONAL ADAPTATION BASED ON CURRENT MESSAGE ANALYSIS ---
  instructions.push(`**Current Message Emotional State:** The user's overall mood from their last message is '${mood}' and sentiment is '${sentiment_label}' (score: ${sentiment_score.toFixed(2)}).`);

  if (emotions && emotions.length > 0) {
    const emotionDetails = emotions.map(e => `${e.label} (score: ${e.score.toFixed(2)})`).join(', ');
    instructions.push(`Specifically, the message expresses: ${emotionDetails}.`);
    instructions.push(`The dominant emotion detected is '${dominant_emotion || 'none'}' with an overall emotional intensity of ${overall_emotional_intensity.toFixed(2)}.`);

    if (dominant_emotion === 'sadness' || dominant_emotion === 'frustration' || dominant_emotion === 'anxiety' || dominant_emotion === 'anger' || dominant_emotion === 'disappointment') {
        instructions.push(`**Guidance for Negative Emotions:** Prioritize acknowledging these specific difficult feelings. Offer comfort, empathy, and suggest practical steps or resources. Your tone should be gentle, supportive, and non-judgmental.`);
        if (feedback_preference === 'encouraging') {
            instructions.push("Deliver support with reassuring, uplifting language, emphasizing resilience and gradual progress.");
        } else if (feedback_preference === 'challenging') {
            instructions.push("While empathetic, gently prompt self-reflection or propose small, actionable steps to address the source of their difficulty.");
        } else { // Default or constructive
            instructions.push("Offer a structured, step-by-step approach to help them analyze and constructively resolve their problem, ensuring empathy first.");
        }
    } else if (dominant_emotion === 'joy' || dominant_emotion === 'excitement' || dominant_emotion === 'hope' || dominant_emotion === 'gratitude' || dominant_emotion === 'curiosity' || dominant_emotion === 'motivation') {
        instructions.push(`**Guidance for Positive Emotions:** Acknowledge and amplify these positive emotions. Express shared enthusiasm, congratulate them, or encourage them to elaborate on their positive experiences. Your tone should be cheerful and encouraging.`);
        if (feedback_preference === 'challenging') {
            instructions.push("Reinforce their positive feelings and suggest how they can leverage this energy for future growth or goals.");
        }
    } else if (overall_emotional_intensity > 0.6 && sentiment_label === 'mixed') {
        instructions.push(`**Guidance for Mixed/High Intensity Emotions:** The user's message is emotionally charged (${overall_emotional_intensity.toFixed(2)}) with mixed feelings. Carefully address both positive and negative aspects, offering balanced and nuanced support. Seek to understand the underlying causes of the mixed emotions.`);
    } else if (overall_emotional_intensity > 0.4 && dominant_emotion === 'curiosity') {
        instructions.push(`**Guidance for Curiosity:** The user is highly curious. Foster this curiosity by providing thorough, engaging explanations and inviting further questions or exploration.`);
    } else {
        // Fallback to general sentiment if no specific dominant emotion dictates a strong action
        if (sentiment_label === 'negative') {
            instructions.push(`**General Negative Sentiment:** Prioritize acknowledging their feeling empathetically and gently guide them towards a solution or understanding. Your tone should be supportive and understanding.`);
            if (feedback_preference === 'encouraging') {
            instructions.push("Deliver support with reassuring, uplifting language, emphasizing progress and capability.");
          } else if (feedback_preference === 'challenging') {
            instructions.push("Frame your support as a gentle challenge. Encourage them to self-reflect and identify actionable steps to overcome the issue.");
          } else {
            instructions.push("Offer a structured, step-by-step approach to help them analyze and constructively resolve their problem.");
          }
        } else if (sentiment_label === 'positive') {
            instructions.push(`**General Positive Sentiment:** Acknowledge and reflect their positive outlook. Express shared enthusiasm, congratulate them, or build on their positive momentum.`);
            if (feedback_preference === 'encouraging') {
            instructions.push("Reinforce their positive feelings with affirming and motivational language, celebrating their success or good mood.");
          }
        } else if (sentiment_label === 'mixed') {
            instructions.push(`**General Mixed Sentiment:** The user expresses mixed emotions. Address both positive and negative aspects carefully, offering balanced support.`);
        } else { // Neutral or undefined
            instructions.push(`**General Neutral Sentiment:** Maintain your standard helpful, curious, and professional demeanor, focusing on clear and concise information.`);
        }
    }
  } else {
      // Fallback if no granular emotions are detected (should be rare with good analysis)
      if (sentiment_label === 'negative') {
          instructions.push(`**General Negative Sentiment (Fallback):** Prioritize acknowledging their feeling empathetically and gently guide them towards a solution or understanding. Your tone should be supportive and understanding.`);
          if (feedback_preference === 'encouraging') {
            instructions.push("Deliver support with reassuring, uplifting language, emphasizing progress and capability.");
          } else if (feedback_preference === 'challenging') {
            instructions.push("Frame your support as a gentle challenge. Encourage them to self-reflect and identify actionable steps to overcome the issue.");
          } else {
            instructions.push("Offer a structured, step-by-step approach to help them analyze and constructively resolve their problem.");
          }
      } else if (sentiment_label === 'positive') {
          instructions.push(`**General Positive Sentiment (Fallback):** Acknowledge and reflect their positive outlook. Express shared enthusiasm, congratulate them, or build on their positive momentum.`);
          if (feedback_preference === 'encouraging') {
            instructions.push("Reinforce their positive feelings with affirming and motivational language, celebrating their success or good mood.");
          }
      } else if (sentiment_label === 'mixed') {
          instructions.push(`**General Mixed Sentiment (Fallback):** The user expresses mixed emotions. Address both positive and negative aspects carefully, offering balanced support.`);
      } else {
          instructions.push(`**General Neutral Sentiment (Fallback):** Maintain your standard helpful, curious, and professional demeanor, focusing on clear and concise information.`);
      }
  }

  // Learning Style Adaptation
  instructions.push(`**Learning Style Adaptation:** When providing information or explanations, adapt to their learning style:`);
  if (learning_style === 'visual') {
    instructions.push("Use vivid visual analogies, metaphors, or invite them to 'imagine' concepts. Suggest mental pictures or diagrams.");
  } else if (learning_style === 'auditory') {
    instructions.push("Use conversational analogies. Explain concepts as if in a clear, engaging dialogue. Suggest 'talking through' ideas.");
  } else if (learning_style === 'kinesthetic') {
    instructions.push("Suggest practical, hands-on steps, actionable examples, or 'walk-throughs.' Focus on how they can 'do' or 'experience' the concept.");
  } else if (learning_style === 'reading') {
    instructions.push("Provide clear, well-structured, and concise textual explanations. Use bullet points, numbered lists, and headings for readability.");
  }

  // Communication Preference Adaptation
  instructions.push(`**Communication Preference Adaptation:** Regarding communication style, adhere to their preference:`);
  if (communication_preference === 'direct') {
    instructions.push("Be direct, get straight to the point, and provide clear, actionable answers without excessive elaboration. Be efficient with your words.");
  } else if (communication_preference === 'exploratory') {
    instructions.push("Be open-ended and curious. Ask thoughtful follow-up questions to encourage deeper exploration, brainstorming, and critical thinking.");
  } else if (communication_preference === 'conceptual') {
    instructions.push("Focus on high-level concepts, underlying principles, and frameworks first, before diving into specific details or examples. Build understanding from the top down.");
  }

  // Other Message Analysis Adaptations
  instructions.push(`**Message Intent:** The user's message intent is '${intent}'. Tailor your response to directly address this purpose.`);
  instructions.push(`**Detected Tone:** The dominant tone detected is '${tone}'. Match your tone to be harmonious with this, or adjust as appropriate for helpfulness.`);
  instructions.push(`**Formality:** Formality score: ${formality_score.toFixed(2)}. Adjust your language formality accordingly.`);
  if (formality_score > 0.6) instructions.push("Maintain a respectful and professional tone. Avoid slang or overly casual language.");
  else if (formality_score < 0.4) instructions.push("Adopt a friendly and approachable tone. Feel free to use contractions and slightly more informal language where appropriate.");
  else instructions.push("Maintain a balanced and adaptable tone.");

  instructions.push(`**Politeness:** Politeness score: ${politeness_score.toFixed(2)}. Respond with a high degree of politeness yourself, regardless of the user's politeness.`);
  if (urgency_score > 0.5) {
    instructions.push(`**Urgency:** The message indicates high urgency (score: ${urgency_score.toFixed(2)}). Prioritize providing a quick, clear, and actionable response.`);
  } else {
    instructions.push(`**Urgency:** The message has low urgency (score: ${urgency_score.toFixed(2)}). You can take a more considered or detailed approach if needed.`);
  }

  if (topic_keywords && topic_keywords.length > 0) {
    instructions.push(`**Topic Keywords:** Main topic keywords: ${topic_keywords.join(', ')}. Focus your response on these core subjects.`);
  }
  instructions.push(`**Domain Context:** The domain context is '${domain_context}'. Frame your response appropriately for this domain.`);
  instructions.push(`**Detected Language:** The user's detected language is '${detected_language}'. Respond in '${detected_language}' with high quality.`);

  // Memory, Daily Focus, Mood Logs, and Goals Integration
  if (memoryContext) {
    instructions.push(`**Long-Term Memory:** Recall these key points from your past interactions with the user (Memory): ${memoryContext}`);
    instructions.push(`Leverage this memory to provide more coherent and contextually relevant responses without explicitly stating "from memory".`);
  }
  
  if (emotionalTrendSummary) {
    instructions.push(`**Emotional Trend Summary:** The user's long-term emotional trend is: "${emotionalTrendSummary}". Use this to provide a more deeply empathetic and supportive response, especially if the trend is negative.`);
  }

  if (dailyFocus) {
    instructions.push(`**Daily Focus:** The user's current daily focus is: "${dailyFocus.focus_text}". Keep this in mind and offer support relevant to this goal, gently guiding them towards achieving it.`);
  }

  if (recentMoodLogs.length > 0) {
    const moodSummaries = recentMoodLogs.map(log => {
      const date = new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${log.mood_label} (score: ${log.sentiment_score.toFixed(2)}) on ${date}`;
    }).join(', ');
    instructions.push(`**Recent Mood History:** The user's recent mood history includes: ${moodSummaries}. Adapt your support and tone based on these emotional trends. For example, if recent moods are negative, offer more comfort and actionable steps for improvement. If positive, reinforce and celebrate.`);
  }

  if (activeGoals.length > 0) {
    instructions.push(`**Active Goals:** The user currently has the following active goals:`);
    activeGoals.forEach((goal, index) => {
      instructions.push(`- Goal ${index + 1}: "${goal.goal_text}"${goal.description ? ` (Description: ${goal.description})` : ''}${goal.due_date ? ` (Due: ${new Date(goal.due_date).toLocaleDateString()})` : ''}.`);
    });
    instructions.push(`As an AI mentor, proactively refer to these goals. Offer encouragement, ask about progress, suggest strategies, or help them break down tasks related to these objectives.`);
  }

  // Handle specific NLP tasks based on analysis (e.g., translation/summarization)
  if (intent === 'translation' && source_text && target_language) {
    instructions.push(`**Translation Task:** The user wants to translate "${source_text}" to ${target_language}. Provide the direct translation.`);
    instructions.push(`Do not add any conversational filler. Just the translation.`);
  } else if (intent === 'summarization' && source_text) {
    instructions.push(`**Summarization Task:** The user wants a summary of "${source_text}". Provide a concise summary.`);
    instructions.push(`Do not add any conversational filler. Just the summary.`);
  }


  return instructions.join("\n");
};

/**
 * Evaluates and fuses responses from multiple models.
 * This is a simple heuristic-based approach. A more advanced system might use a smaller LLM
 * to evaluate and combine the responses, or a ranking algorithm.
 * @param responses Array of { modelName, content, latency } objects.
 * @param prompt The original user prompt.
 * @param userAnalysisResult The NLP analysis of the prompt.
 * @returns The best response string.
 */
function evaluateAndFuseResponses(
  responses: Array<{ modelName: string; content: string; latency: number }>,
  prompt: string,
  userAnalysisResult: MessageAnalysis
): string {
  // Sort responses by a simple quality score (e.g., relevance, length, latency)
  const sortedResponses = responses.sort((a, b) => {
    // Simple relevance check: Does the response contain keywords from the prompt?
    const aRelevance = userAnalysisResult.topic_keywords.filter(keyword => a.content.toLowerCase().includes(keyword.toLowerCase())).length;
    const bRelevance = userAnalysisResult.topic_keywords.filter(keyword => b.content.toLowerCase().includes(keyword.toLowerCase())).length;

    // Favor more relevant responses
    if (aRelevance !== bRelevance) {
      return bRelevance - aRelevance;
    }

    // Favor longer, more detailed responses for complex intents
    if (userAnalysisResult.intent === 'complex_reasoning' || userAnalysisResult.intent === 'summarization') {
      return b.content.length - a.content.length;
    }
    
    // For quick tasks, favor faster responses
    if (userAnalysisResult.intent === 'hello' || userAnalysisResult.intent === 'greeting') {
      return a.latency - b.latency;
    }

    // Default to the fastest model
    return a.latency - b.latency;
  });

  // Take the best response's content
  const bestResponse = sortedResponses[0];
  console.log(`✅ Selected best response from model: ${bestResponse.modelName} (Latency: ${bestResponse.latency.toFixed(2)}ms)`);
  return bestResponse.content;
}

// Ensure body parser is disabled for this route to handle FormData
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
  // 1. Handle FormData in POST Request
  const form = new IncomingForm();
  
  let fields: Fields;
  let files: Files;
  
  try {
    [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req as any, (err, flds, fls) => {
        if (err) return reject(err);
        resolve([flds, fls]);
      });
    });
  } catch (err) {
    console.error('❌ Error parsing FormData:', err);
    return NextResponse.json({ content: '❌ Failed to process the request due to an issue with file upload.' }, { status: 400 });
  }

  let prompt: string | undefined = Array.isArray(fields.prompt) ? fields.prompt[0] : fields.prompt;
  
  // FIX: Handle the case where prompt is undefined
  if (!prompt) {
    return NextResponse.json({ content: '⚠️ Please enter a message to chat with Quirra.' }, { status: 400 });
  }
  
  // Now TypeScript knows that `prompt` is a string here
  const reset = Array.isArray(fields.reset) ? fields.reset[0] === 'true' : fields.reset === 'true';
  const userName = Array.isArray(fields.userName) ? fields.userName[0] : fields.userName;
  const clientPersonalityProfile = fields.personalityProfile ? JSON.parse(Array.isArray(fields.personalityProfile) ? fields.personalityProfile[0] : fields.personalityProfile) : null;
  const chatSessionId = Array.isArray(fields.chatSessionId) ? fields.chatSessionId[0] : fields.chatSessionId;
  const messages = fields.messages ? JSON.parse(Array.isArray(fields.messages) ? fields.messages[0] : fields.messages) : [];
  const isRegenerating = Array.isArray(fields.isRegenerating) ? fields.isRegenerating[0] === 'true' : fields.isRegenerating === 'true';

  let uploadedFileContent = '';

  // 2. File Validation and 3. Read File Content
  const file = files.file?.[0]; // Get the first file from the 'file' field
  if (file) {
    console.log(`📁 File uploaded: ${file.originalFilename}, Size: ${file.size} bytes`);
    
    // File Size Limit
    if (file.size > MAX_FILE_SIZE) {
      console.error(`❌ File too large: ${file.size} bytes. Max size is ${MAX_FILE_SIZE} bytes.`);
      return NextResponse.json({ content: '❌ The uploaded file is too large. Please upload a file smaller than 10MB.' }, { status: 413 });
    }

    const fileExtension = path.extname(file.originalFilename || '').toLowerCase();
    
    try {
      if (fileExtension === '.txt') {
        const fileBuffer = await readFileAsync(file.filepath);
        uploadedFileContent = fileBuffer.toString('utf8');
      } else if (fileExtension === '.pdf') {
        const fileBuffer = await readFileAsync(file.filepath);
        const data = await pdf(fileBuffer);
        uploadedFileContent = data.text;
      } else if (fileExtension === '.docx') {
        const data = await mammoth.extractRawText({ path: file.filepath });
        uploadedFileContent = data.value;
      } else {
        console.warn(`⚠️ Unsupported file type: ${fileExtension}`);
        return NextResponse.json({ content: '⚠️ Unsupported file type. Please upload a .txt, .pdf, or .docx file.' }, { status: 400 });
      }
      // 4. Combine File Content with User Prompt
      prompt = `[File Content]\n${uploadedFileContent}\n\n[User Prompt]\n${prompt}`;
      console.log('✅ File content successfully extracted and combined with prompt.');
    } catch (err) {
      // 6. Handle File Parsing Failures
      console.error('❌ Error parsing file:', err);
      return NextResponse.json({ content: '❌ Failed to process the uploaded file. Please ensure it is not corrupted and try again.' }, { status: 500 });
    } finally {
      // Clean up the temporary file
      try {
        await fs.promises.unlink(file.filepath);
        console.log(`🗑️ Temporary file deleted: ${file.filepath}`);
      } catch (cleanupErr) {
        console.error(`⚠️ Failed to delete temporary file: ${file.filepath}`, cleanupErr);
      }
    }
  }
  
  // 7. Data Security & Privacy Considerations (Commented reminder)
  /*
    * This is a reminder for a production environment.
    * For a real-world application, consider these points:
    * - Secure File Storage: If temporary files must be stored, use a secure, private bucket (e.g., S3).
    * - Data Deletion Policy: Implement a cron job or webhook to delete processed files shortly after use.
    * - User Control: Provide a UI for users to manage their uploaded files and long-term memory.
  */

  const supabase = createRouteHandlerClient({ cookies });

  // Environment variable access for API keys
  const serperKey = process.env.SERPER_API_KEY;
  const orsApiKey = process.env.OPENROUTESERVICE_API_KEY;
  const witAiAccessToken = process.env.WIT_AI_SERVER_ACCESS_TOKEN;
  const nextPublicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const nextPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY_HERE') {
    console.error('❌ Server Error: OPENROUTER_API_KEY is not set. Cannot perform core AI functions.');
    return NextResponse.json({ content: '❌ Server configuration error: OpenRouter API key is missing. This is essential for core AI functions.' }, { status: 500 });
  }

  if (!serperKey) {
    console.warn('⚠️ Server Warning: SERPER_API_KEY is not set. Live search functionality will be unavailable.');
  }

  if (!orsApiKey) {
    console.warn('⚠️ Server Warning: OPENROUTESERVICE_API_KEY is not set. Geospatial functionality will be unavailable.');
  }

  if (!witAiAccessToken) {
    console.warn('⚠️ Server Warning: WIT_AI_SERVER_ACCESS_TOKEN is not set. Advanced NLP features might be limited.');
  }

  if (!nextPublicSupabaseAnonKey || !nextPublicSupabaseUrl) {
    console.warn('⚠️ Server Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL not fully set. Ensure client-side Supabase configuration is correct.');
  } else {
    console.log(`✅ Supabase URL: ${nextPublicSupabaseUrl}`);
  }

  if (!chatSessionId) {
    console.error('❌ Client Error: chatSessionId is missing from the request.');
    return NextResponse.json({ content: '❌ Chat session ID is missing. Please restart your chat.' }, { status: 400 });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication Error:', authError?.message || 'User not found.');
      return NextResponse.json({ content: '❌ You must log in to use Quirra. Please sign in.' }, { status: 401 });
    }
    const userId = user.id;

    // --- Token Limit Check and Update ---
    const { data: userProfile, error: fetchProfileError } = await supabase
      .from('profiles')
      .select('daily_token_usage, last_usage_date')
      .eq('id', userId)
      .single();

    if (fetchProfileError && fetchProfileError.code !== 'PGRST116') {
      console.error('❌ Supabase Error: Failed to fetch user profile for token check:', fetchProfileError.message);
      return NextResponse.json({ content: '❌ Failed to retrieve user token data. Please try again.' }, { status: 500 });
    }

    let currentDailyTokenUsage = userProfile?.daily_token_usage || 0;
    const lastUsageDate = userProfile?.last_usage_date;
    const today = new Date().toISOString().split('T')[0];

    if (!lastUsageDate || lastUsageDate !== today) {
      currentDailyTokenUsage = 0;
      const { error: resetError } = await supabase
        .from('profiles')
        .update({ daily_token_usage: 0, last_usage_date: today })
        .eq('id', userId);
      if (resetError) {
        console.error('❌ Supabase Error: Failed to reset daily token usage:', resetError.message);
      }
    }

    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    if (currentDailyTokenUsage + estimatedInputTokens > DAILY_TOKEN_LIMIT) {
      return NextResponse.json({ content: `🚫 You have exceeded your daily token limit of ${DAILY_TOKEN_LIMIT} tokens. Please try again tomorrow.` }, { status: 429 });
    }
    // --- End Token Limit Check ---

    if (reset === true) {
      console.log(`Initiating conversation reset for user: ${userId}, session: ${chatSessionId}`);
      const { error: deleteMessagesError } = await supabase.from('messages').delete().eq('user_id', userId).eq('chat_session_id', chatSessionId);
      const { error: deleteMemoryError } = await supabase.from('memory').delete().eq('user_id', userId).eq('chat_session_id', chatSessionId);
      const { data: profileUpdateData, error: updateProfileError } = await supabase
        .from('profiles')
        .update({ last_proactive_checkin_at: null, daily_token_usage: 0, last_usage_date: today })
        .eq('id', userId);

      if (deleteMessagesError || deleteMemoryError || updateProfileError) {
        console.error('❌ Supabase Error: Failed to clear messages or memory for reset:', deleteMessagesError?.message || deleteMemoryError?.message || updateProfileError?.message);
        return NextResponse.json({ content: '🧠 Failed to reset conversation. Please try again.' }, { status: 500 });
      }

      console.log(`✅ Conversation history and memory reset for user: ${userId}, session: ${chatSessionId}`);
      return NextResponse.json({ content: '🧠 Conversation reset. Let\'s begin again.' });
    }

    // 1. Receive User Input & 2. Intent Classification + Confidence Scoring
    console.log('🧠 Analyzing user message...');
    const userAnalysisResult: MessageAnalysis & { confidence?: number } = await analyzeMessage(prompt);
    console.log('✅ User message analysis complete:', userAnalysisResult);

    if (userAnalysisResult.confidence && userAnalysisResult.confidence < 0.7) {
      return NextResponse.json({ content: "I'm not quite sure I understand. Could you please clarify what you mean? For example, are you asking for information, a solution, or something else?" }, { status: 200 });
    }


    const { data: historyData, error: fetchHistoryError } = await supabase.from('messages').select('role, content').eq('user_id', userId).eq('chat_session_id', chatSessionId).order('created_at', { ascending: true }).limit(12);
    if (fetchHistoryError) {
      console.error('❌ Supabase Error: Failed to fetch message history:', fetchHistoryError.message);
    }

    let memoryContext = '';
    let emotionalTrendSummary: string | null = null;
    const { data: generalMemoryData, error: fetchGeneralMemoryError } = await supabase.from('memory').select('content, key').eq('user_id', userId).order('timestamp', { ascending: false }).limit(5);

    if (fetchGeneralMemoryError) {
      console.error('❌ Supabase Error: Failed to fetch general user memory:', fetchGeneralMemoryError.message);
    } else if (generalMemoryData && generalMemoryData.length > 0) {
      memoryContext = generalMemoryData.map((m: { content: string }) => m.content).join('; ') || '';
      const foundSummary = generalMemoryData.find((m: { key: string }) => m.key === 'emotional_trend_summary');
      if (foundSummary) {
        emotionalTrendSummary = foundSummary.content;
      }
    }

    let dailyFocus: DailyFocus | null = null;
    const { data: focusData, error: fetchFocusError } = await supabase.from('daily_focus').select('focus_text, created_at').eq('user_id', userId).eq('date', today).single();
    if (fetchFocusError && fetchFocusError.code !== 'PGRST116') {
      console.error('❌ Supabase Error: Failed to fetch daily focus:', fetchFocusError.message);
    } else if (focusData) {
      dailyFocus = focusData;
    }

    let recentMoodLogs: MoodLog[] = [];
    const { data: moodLogsData, error: fetchMoodLogsError } = await supabase.from('mood_logs').select('mood_label, sentiment_score, timestamp').eq('user_id', userId).order('timestamp', { ascending: false }).limit(3);
    if (fetchMoodLogsError) {
      console.error('❌ Supabase Error: Failed to fetch mood logs:', fetchMoodLogsError.message);
    } else if (moodLogsData) {
      recentMoodLogs = moodLogsData;
    }

    let activeGoals: UserGoal[] = [];
    const { data: goalsData, error: fetchGoalsError } = await supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: true });
    if (fetchGoalsError) {
      console.error('❌ Supabase Error: Failed to fetch active goals:', fetchGoalsError.message);
    } else if (goalsData) {
      activeGoals = goalsData as UserGoal[];
    }

    let userPersonalityProfile: PersonalityProfile | null = clientPersonalityProfile;
    if (!userPersonalityProfile) {
        const { data: profileData, error: fetchProfileError } = await supabase.from('profiles').select('personality_profile').eq('id', userId).single();
        if (fetchProfileError && fetchProfileError.code !== 'PGRST116') {
            console.error('❌ Supabase Error: Failed to fetch user personality profile:', fetchProfileError.message);
        } else if (profileData?.personality_profile) {
            userPersonalityProfile = profileData.personality_profile as PersonalityProfile;
        }
    }

    const { data: currentProfileData, error: fetchCurrentProfileError } = await supabase.from('profiles').select('last_proactive_checkin_at').eq('id', userId).single();
    let initialProactiveMessage: string | null = null;
    if (currentProfileData !== null && !fetchCurrentProfileError) {
      const lastCheckinAt = currentProfileData?.last_proactive_checkin_at ? new Date(currentProfileData.last_proactive_checkin_at) : null;
      const now = new Date();
      const hoursSinceLastCheckin = lastCheckinAt ? (now.getTime() - lastCheckinAt.getTime()) / (1000 * 60 * 60) : Infinity;

      if (hoursSinceLastCheckin >= PROACTIVE_CHECKIN_INTERVAL_HOURS && emotionalTrendSummary) {
        console.log(`🧠 Proactive check-in due for user ${userId}. Generating message...`);
        try {
          const proactiveModel = MODELS['GLM 4.5 Air'].name;
          const proactiveRes = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'YOUR_SITE_URL_HERE',
              'X-Title': 'Your Chatbot Prototype',
            },
            body: JSON.stringify({
              model: proactiveModel,
              messages: [
                {
                  role: "system",
                  content: `You are Quirra, an empathetic AI assistant. Based on the user's recent emotional trends, craft a very short (1-2 sentences), gentle, and supportive proactive check-in message. It should acknowledge their emotional state and offer general support or suggest checking in with a tool (like Daily Focus, Mood Logger, or Goal Setting). Do NOT ask direct questions that demand an immediate answer. Do NOT mention "emotional trends" directly. Just a warm, subtle check-in.
                  Example 1 (negative trend): "I've been thinking about you. Remember, I'm here to support you through any challenges you might be facing."
                  Example 2 (mixed/stressed trend): "Just checking in. If you need a moment to reflect or plan, I'm here to help."
                  Example 3 (no strong trend/general): "Hope you're having a good day! I'm here if you need anything."
                  Example 4 (positive trend): "It's great to see your positive energy! Keep up the amazing work."
                  `
                },
                {
                  role: "user",
                  content: `Based on this emotional trend summary: "${emotionalTrendSummary}", generate a proactive check-in message for the user.`
                }
              ],
              temperature: 0.7,
              max_tokens: 60,
            }),
            signal: AbortSignal.timeout(5000)
          });
          if (proactiveRes.ok) {
            const proactiveData = await proactiveRes.json();
            initialProactiveMessage = proactiveData.choices?.[0]?.message?.content?.trim() || null;
            if (initialProactiveMessage) {
              console.log(`✅ Generated proactive message: "${initialProactiveMessage}"`);
              const { error: updateCheckinError } = await supabase
                .from('profiles')
                .update({ last_proactive_checkin_at: now.toISOString() })
                .eq('id', userId);
              if (updateCheckinError) {
                console.error('❌ Supabase Error: Failed to update last_proactive_checkin_at:', updateCheckinError.message);
              }
            }
          } else {
            console.error('❌ Error generating proactive message:', await proactiveRes.text());
          }
        } catch (proactiveError: any) {
          console.error('❌ Error generating proactive message:', proactiveError.message);
        }
      }
    }

    const conversationHistoryForLLM: ChatMessage[] = messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
    }));

    if (isRegenerating && conversationHistoryForLLM[conversationHistoryForLLM.length - 1]?.role === 'assistant') {
        conversationHistoryForLLM.pop();
    }

    const systemInstruction = getQuirraPersonalizedInstruction(
        userPersonalityProfile,
        userAnalysisResult,
        userName,
        memoryContext,
        dailyFocus,
        recentMoodLogs,
        activeGoals,
        emotionalTrendSummary
    );
    
    // 5. Send Combined Prompt to the LLM Model
    let messagesForLLM = [
      { role: 'system' as const, content: systemInstruction },
      ...conversationHistoryForLLM,
      { role: 'user' as const, content: prompt },
    ];

    // Log the user message and perform post-save actions
    const messageSavedSuccessfully = await saveMessage(supabase, userId, chatSessionId, 'user', prompt, userAnalysisResult);
    if (messageSavedSuccessfully) {
        const { count, error: countError } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('chat_session_id', chatSessionId);
        if (countError) {
            console.error('❌ Supabase Error: Failed to get message count for summarization trigger:', countError.message);
        } else if (count !== null && count % MESSAGE_COUNT_FOR_EMOTIONAL_SUMMARY === 0) {
            console.log(`🧠 Triggering emotional trend summarization for user ${userId} in session ${chatSessionId} (message count: ${count})...`);
            Promise.resolve(summarizeEmotionalTrends(supabase, userId, chatSessionId))
                .then(summary => {
                    if (summary) {
                        console.log(`✅ Asynchronous emotional trend summarization completed.`);
                    } else {
                        console.warn(`⚠️ Asynchronous emotional trend summarization failed or returned no summary.`);
                    }
                })
                .catch(err => {
                    console.error(`❌ Error during asynchronous emotional trend summarization:`, err);
                });
        }
    }

    // --- Autonomous Tool Usage & Routing ---
    // (This section is now placed right before the LLM call to inform the LLM of tool results)
    if (orsApiKey) {
      if (userAnalysisResult.intent === 'geocoding' && userAnalysisResult.location_query) {
        const coords = await geocodeAddress(userAnalysisResult.location_query);
        if (coords) {
          const toolResult = `(Internal Note: Geocoding result for "${userAnalysisResult.location_query}": Lat ${coords.lat.toFixed(4)}, Lng ${coords.lng.toFixed(4)}. Integrate this into your response.)`;
          messagesForLLM.push({ role: 'system' as const, content: toolResult });
          console.log(`⚙️ Tool Used: Geocoding`);
        } else {
          const toolResult = `(Internal Note: Geocoding failed for "${userAnalysisResult.location_query}". Attempt to answer based on general knowledge.)`;
          messagesForLLM.push({ role: 'system' as const, content: toolResult });
          console.log(`⚙️ Tool Failed: Geocoding`);
        }
      } else if (userAnalysisResult.intent === 'directions' && userAnalysisResult.start_location && userAnalysisResult.end_location) {
        const startCoords = await geocodeAddress(userAnalysisResult.start_location);
        const endCoords = await geocodeAddress(userAnalysisResult.end_location);
        if (startCoords && endCoords) {
          const directions = await getDirections(startCoords, endCoords, userAnalysisResult.travel_mode || 'driving-car');
          if (directions) {
            const toolResult = `(Internal Note: Directions from "${userAnalysisResult.start_location}" to "${userAnalysisResult.end_location}":\n${directions}\nIntegrate this into your response.)`;
            messagesForLLM.push({ role: 'system' as const, content: toolResult });
            console.log(`⚙️ Tool Used: Directions`);
          } else {
            const toolResult = `(Internal Note: Failed to get directions. Attempt to answer based on general knowledge.)`;
            messagesForLLM.push({ role: 'system' as const, content: toolResult });
            console.log(`⚙️ Tool Failed: Directions`);
          }
        } else {
          const toolResult = `(Internal Note: Could not geocode one or both locations for directions. Attempt to answer based on general knowledge.)`;
          messagesForLLM.push({ role: 'system' as const, content: toolResult });
          console.log(`⚙️ Tool Failed: Directions (Geocoding issue)`);
        }
      } else if (userAnalysisResult.intent === 'matrix' && userAnalysisResult.locations_for_matrix && userAnalysisResult.locations_for_matrix.length > 1) {
        const geocodedLocations: LatLng[] = [];
        for (const loc of userAnalysisResult.locations_for_matrix) { const coords = await geocodeAddress(loc); if (coords) geocodedLocations.push(coords); }
        if (geocodedLocations.length === userAnalysisResult.locations_for_matrix.length) {
          const matrix = await getMatrix(geocodedLocations, userAnalysisResult.travel_mode || 'driving-car');
          if (matrix) {
            const toolResult = `(Internal Note: Travel Matrix for provided locations:\n${matrix}\nIntegrate this into your response.)`;
            messagesForLLM.push({ role: 'system' as const, content: toolResult });
            console.log(`⚙️ Tool Used: Matrix`);
          } else {
            const toolResult = `(Internal Note: Failed to get travel matrix. Attempt to answer based on general knowledge.)`;
            messagesForLLM.push({ role: 'system' as const, content: toolResult });
            console.log(`⚙️ Tool Failed: Matrix`);
          }
        } else {
          const toolResult = `(Internal Note: Could not geocode all locations for travel matrix. Attempt to answer based on general knowledge.)`;
          messagesForLLM.push({ role: 'system' as const, content: toolResult });
          console.log(`⚙️ Tool Failed: Matrix (Geocoding issue)`);
        }
      } else if (userAnalysisResult.intent === 'isochrones' && userAnalysisResult.center_location && userAnalysisResult.range_values && userAnalysisResult.range_values.length > 0) {
        const centerCoords = await geocodeAddress(userAnalysisResult.center_location);
        if (centerCoords) {
          const isochrone = await getIsochrones(centerCoords, userAnalysisResult.range_values, userAnalysisResult.travel_mode || 'driving-car', userAnalysisResult.range_type || 'time');
          if (isochrone) {
            const toolResult = `(Internal Note: Isochrone data for "${userAnalysisResult.center_location}":\n${isochrone}\nIntegrate this into your response.)`;
            messagesForLLM.push({ role: 'system' as const, content: toolResult });
            console.log(`⚙️ Tool Used: Isochrones`);
          } else {
            const toolResult = `(Internal Note: Failed to get isochrone data. Attempt to answer based on general knowledge.)`;
            messagesForLLM.push({ role: 'system' as const, content: toolResult });
            console.log(`⚙️ Tool Failed: Isochrones`);
          }
        } else {
          const toolResult = `(Internal Note: Could not geocode center location for isochrones. Attempt to answer based on general knowledge.)`;
          messagesForLLM.push({ role: 'system' as const, content: toolResult });
          console.log(`⚙️ Tool Failed: Isochrones (Geocoding issue)`);
        }
      } else if (userAnalysisResult.intent === 'elevation' && userAnalysisResult.locations_for_elevation && userAnalysisResult.locations_for_elevation.length > 0) {
        const geocodedLocations: LatLng[] = [];
        for (const loc of userAnalysisResult.locations_for_elevation) { const coords = await geocodeAddress(loc); if (coords) geocodedLocations.push(coords); }
        if (geocodedLocations.length === userAnalysisResult.locations_for_elevation.length) {
          const elevation = await getElevation(geocodedLocations);
          if (elevation) {
            const toolResult = `(Internal Note: Elevation data for provided locations:\n${elevation}\nIntegrate this into your response.)`;
            messagesForLLM.push({ role: 'system' as const, content: toolResult });
            console.log(`⚙️ Tool Used: Elevation`);
          } else {
            const toolResult = `(Internal Note: Failed to get elevation data. Attempt to answer based on general knowledge.)`;
            messagesForLLM.push({ role: 'system' as const, content: toolResult });
            console.log(`⚙️ Tool Failed: Elevation`);
          }
        } else {
          const toolResult = `(Internal Note: Could not geocode all locations for elevation. Attempt to answer based on general knowledge.)`;
          messagesForLLM.push({ role: 'system' as const, content: toolResult });
          console.log(`⚙️ Tool Failed: Elevation (Geocoding issue)`);
        }
      }
    }

    // 4. Invoke SERPER API for Live Web Search (If Needed)
    const needsLiveSearch = serperKey && (userAnalysisResult.intent === 'information_seeking' || userAnalysisResult.intent === 'question' || userAnalysisResult.topic_keywords.some((keyword: string) => ["news", "current", "latest", "update", "weather", "define", "how to", "what is"].includes(keyword.toLowerCase())) || prompt.toLowerCase().includes('search'));

    if (needsLiveSearch && serperKey) {
      console.log('🔍 Performing live search with Serper for prompt:', prompt);
      try {
        const searchRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': serperKey },
          body: JSON.stringify({ q: prompt }),
          signal: AbortSignal.timeout(10000)
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          type SearchResult = { title: string; snippet: string; link: string };
          const results = (searchData?.organic as SearchResult[] | undefined)?.filter((r) => r.title && r.snippet && r.link);
          if (results?.length) {
            const topSummaries = results.slice(0, 3).map((r) => `🔹 **${r.title}**\n${r.snippet}\n🔗 ${r.link}`).join('\n\n');
            messagesForLLM.push({ role: 'system' as const, content: `(Internal Note: Live search results for "${prompt}":\n\n${topSummaries}\n\nIntegrate this information into your response naturally.)` });
            console.log('✅ Serper search results added to LLM context.');
            console.log(`⚙️ Tool Used: Serper Web Search`);
          } else {
            console.warn('⚠️ Serper returned no useful results for the query. LLM will use general knowledge.');
            messagesForLLM.push({ role: 'system' as const, content: `(Internal Note: Serper search returned no useful results for "${prompt}". Answer based on general knowledge and context.)` });
            console.log(`⚙️ Tool Failed: Serper Web Search (No results)`);
          }
        } else {
          console.error(`❌ Serper API Error: ${searchRes.status} - ${await searchRes.text()}`);
          messagesForLLM.push({ role: 'system' as const, content: `(Internal Note: Serper search for "${prompt}" failed. Attempt to answer based on general knowledge and context.)` });
          console.log(`⚙️ Tool Failed: Serper Web Search (API Error)`);
        }
      } catch (searchError: any) {
        console.error('❌ Error during Serper search:', searchError.message);
        messagesForLLM.push({ role: 'system' as const, content: `(Internal Note: Error during Serper search for "${prompt}". Answer based on general knowledge and context.)` });
        console.log(`⚙️ Tool Failed: Serper Web Search (Runtime Error)`);
      }
    } else if (needsLiveSearch && !serperKey) {
      console.warn('⚠️ Serper API key is not set. Cannot perform live search. LLM will use general knowledge.');
      messagesForLLM.push({ role: 'system' as const, content: `(Internal Note: Serper API key is missing. Live search is unavailable. Answer based on general knowledge and context.)` });
    }

    const MIN_MESSAGES_FOR_SUMMARY = 5;
    const MAX_HISTORY_FOR_SUMMARY = 10;
    if (historyData && historyData.length >= MIN_MESSAGES_FOR_SUMMARY) {
      const messagesToSummarize = historyData.slice(-MAX_HISTORY_FOR_SUMMARY);
      if (messagesToSummarize.length > 0) {
        console.log(`🧠 Triggering summarization for ${messagesToSummarize.length} messages in session ${chatSessionId}...`);
        const summarizeApiUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/summarize` : 'http://localhost:3000/api/summarize';
        fetch(summarizeApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatSessionId: chatSessionId, messagesToSummarize: messagesToSummarize.map((msg: any) => ({ role: msg.role, content: msg.content })) }),
        }).then(response => {
          if (!response.ok) { response.json().then(err => console.error('❌ Summarization API Error:', err.message)); }
          else { console.log('✅ Summarization API call initiated successfully.'); }
        }).catch(err => { console.error('❌ Error calling summarization API:', err); });
      }
    }

    // --- 3. Dispatch to All LLM Models (Parallel Model Querying) ---
    const modelsToQuery = getRelevantModels(prompt);
    console.log(`🤖 Dispatching prompt to models: ${modelsToQuery.join(', ')}`);

    const modelPromises = modelsToQuery.map(modelName => {
      const startTime = performance.now();
      return fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'YOUR_SITE_URL_HERE',
          'X-Title': 'Your Chatbot Prototype',
        },
        body: JSON.stringify({
          model: modelName,
          messages: messagesForLLM,
          max_tokens: 800,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(40000) // Timeout for each model call
      })
      .then(res => {
        const latency = performance.now() - startTime;
        if (!res.ok) {
          return res.text().then(errorText => {
            console.error(`❌ LLM API Error for model ${modelName}: ${res.status} - ${errorText}`);
            return null; // Return null for failed requests
          });
        }
        return res.json().then(data => {
          return {
            modelName,
            content: data.choices?.[0]?.message?.content?.trim() || '',
            latency,
            usage: data.usage
          };
        });
      })
      .catch(err => {
        console.error(`❌ Fetch Error for model ${modelName}:`, err.message);
        return null;
      });
    });

    // Await all model responses
    const responses = (await Promise.all(modelPromises)).filter(Boolean) as Array<{ modelName: string; content: string; latency: number; usage: any }>;

    if (responses.length === 0) {
      console.error('❌ All model calls failed.');
      return NextResponse.json({ content: '🚨 All AI models failed to generate a response. Please try again later.' }, { status: 500 });
    }

    // 5. Response Evaluation & Fusion
    const bestResponseContent = evaluateAndFuseResponses(responses, prompt, userAnalysisResult);

    // Get total tokens used across all successful model calls
    let totalOutputTokens = responses.reduce((acc, res) => acc + (res.usage?.completion_tokens || 0), 0);

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        if (initialProactiveMessage) {
          const proactiveMessageId = crypto.randomUUID();
          controller.enqueue(encoder.encode(`data:${JSON.stringify({ type: 'proactive_message', id: proactiveMessageId, content: initialProactiveMessage, chatSessionId, created_at: new Date().toISOString() })}\n\n`));
          await saveMessage(supabase, userId, chatSessionId, 'assistant', initialProactiveMessage);
        }

        // The response is no longer a stream, send it as one chunk
        controller.enqueue(encoder.encode(`data:${JSON.stringify({ type: 'llm_response_chunk', content: bestResponseContent })}\n\n`));
        controller.enqueue(encoder.encode('data:[DONE]\n\n'));

        // Save the fused response to DB
        if (bestResponseContent) {
          await saveMessage(supabase, userId, chatSessionId, 'assistant', bestResponseContent);
        }

        // Update daily token usage in Supabase after the main response is generated
        const finalTokensUsed = estimatedInputTokens + totalOutputTokens;
        const { error: updateUsageError } = await supabase
          .from('profiles')
          .update({ daily_token_usage: currentDailyTokenUsage + finalTokensUsed, last_usage_date: today })
          .eq('id', userId);

        if (updateUsageError) {
          console.error('❌ Supabase Error: Failed to update daily token usage after response:', updateUsageError.message);
        } else {
          console.log(`✅ User ${userId} daily token usage updated. Used ${finalTokensUsed} tokens. New total: ${currentDailyTokenUsage + finalTokensUsed}/${DAILY_TOKEN_LIMIT}`);
        }

        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error('❌ Critical API Route Error:', err);
    return NextResponse.json({ content: `🚨 An unexpected critical error occurred: ${err.message}. Please try again later.` }, { status: 500 });
  }
}