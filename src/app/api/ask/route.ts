import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { analyzeMessage, MessageAnalysis } from '@/utils/analyzeMessage';
import { summarizeEmotionalTrends } from '@/utils/summarizeEmotionalTrends';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import util from 'util';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/* ---------------------------
   callModel - OpenRouter-only wrapper
   Insert this right after imports (before other top-level functions/constants)
--------------------------- */

async function callModel({
  messages,
  model,
  temperature = 0.7,
  max_tokens = 800,
  timeoutMs = 120000,
  maxAttempts = 3,
}: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  timeoutMs?: number;
  maxAttempts?: number;
}): Promise<string> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set in env.");
  }

  const OPENROUTER_API_URL =
    process.env.OPENROUTER_API_URL ||
    "https://openrouter.ai/api/v1/chat/completions";

  const OPENROUTER_MODEL = model || process.env.OPENROUTER_MODEL || "gpt-4o-mini";

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const payload: any = {
        model: OPENROUTER_MODEL,
        messages,
        temperature,
        max_tokens,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status === 429 || res.status >= 500) {
          // transient
          throw new Error(`transient:${res.status}:${text || res.statusText}`);
        } else {
          // permanent
          throw new Error(`permanent:${res.status}:${text || res.statusText}`);
        }
      }

      const data = await res.json().catch(() => null);
      const content =
        data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? null;

      if (!content) {
        throw new Error("empty_response: OpenRouter returned no content");
      }

      return String(content).trim();
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      const isAbort = /abort|timeout/i.test(msg);
      const isTransient = /transient|timeout|ECONNRESET|ETIMEDOUT|429|5\d{2}/i.test(
        msg
      );

      if (attempt < maxAttempts && (isTransient || isAbort)) {
        const backoff = 200 * Math.pow(2, attempt); // 400ms, 800ms, 1600ms ...
        console.warn(
          `[callModel] attempt ${attempt} failed (transient). backing off ${backoff}ms. err=${msg}`
        );
        await sleep(backoff);
        continue;
      }

      console.error("[callModel] final failure:", msg);
      throw new Error(msg.replace(/^transient:|^permanent:/, ""));
    }
  }

  throw new Error("callModel: exhausted retries");
}

// --- Quick Command Prompt Templates ---
const COMMAND_PROMPT_MAP: Record<string, (input: string) => string> = {
  idea: (input) =>
    `You are Quirra, an imaginative creative assistant. Generate original, high-quality ideas based on the user's request.\n\nUser Request: ${input}\n\nOutput: A list of unique, well-explained ideas with short justifications.`,
  design: (input) =>
    `You are Quirra, a skilled UX/UI concept generator and creative designer. Turn the user's prompt into a structured creative concept or design idea.\n\nUser Request: ${input}\n\nOutput: Describe layout, colors, features, and feeling.`,
  study: (input) =>
    `You are Quirra, an expert teacher. Turn the user's question into a concise, easy-to-understand explanation or a short study guide.\n\nQuestion: ${input}\n\nOutput: Summarize clearly and provide helpful examples.`,
  task: (input) =>
    `You are Quirra, an efficient productivity planner. Turn the user's input into a prioritized task list with brief explanations.\n\nUser Input: ${input}\n\nOutput: A clear action plan.`,
  upload: (input) =>
    `You are Quirra, an analytical assistant that can describe and interpret uploaded content. The user uploaded a file. Based on their message, explain what could be done with the file.\n\nContext: ${input}`
};


// Promisify the file parsing function for async/await usage
const readFileAsync = util.promisify(fs.readFile);
const renameAsync = util.promisify(fs.rename);

// 🧩 Enhanced message structure (supports images, files, etc.)
interface ChatMessage {
  id?: string; // optional if you generate IDs elsewhere
  role: 'system' | 'user' | 'assistant';
  content: string;

  // Optional extended fields for multimodal or structured messages
  type?: 'text' | 'image' | 'file';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  created_at?: string;
}

// 🧩 Enhanced message structure (supports images, files, etc.)
interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'file';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  created_at?: string;
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

// --- Model Definitions and Capabilities (REPLACED with user's 5 free models) ---
const MODELS = {
  'Gemini 2.0 Flash Experimental': {
    // NOTE: OpenRouter shows Gemini 2.0 Flash as `google/gemini-2.0-flash-001`
    name: 'google/gemini-2.0-flash-001',
    description: 'Gemini Flash 2.0 experimental - long-context, multimodal, fast.',
    context: 1000000,
    isFree: true,
  },

  'Meta Llama 4 Maverick (free)': {
  name: 'meta-llama/llama-4-maverick:free', // exact model id with :free
  description: 'Meta Llama 4 Maverick — 400B MoE with strong reasoning, coding, and multilingual capabilities (free tier).',
  context: 1000000, // 1M context window as documented
  isFree: true,
 },


  'Grok 4 Fast': {
    name: 'x-ai/grok-4-fast:free',
    description: 'xAI Grok 4 Fast — large-context, fast variant .',
    context: 2000000,
    isFree: true,
  },

  'Llama 3.3 8B Instruct': {
    name: 'meta-llama/llama-3.3-8b-instruct:free',
    description: 'Llama 3.3 8B Instruct (fast, cheap).',
    context: 128000,
    isFree: true,
  },

  'Devstral Small 1.1': {
    // On OpenRouter this may show as 'mistralai/devstral-small' optionally with :free
    name: 'mistralai/devstral-small',
    description: 'Mistral Devstral Small — coding-specialized.',
    context: 131072,
    isFree: true,
  },
};

// --- Model Selection Logic (UPDATED for the five selected free models) ---
function getRelevantModels(prompt: string, analysisResult: MessageAnalysis): string[] {
  const selectedModels = new Set<string>();
  const lowerCasePrompt = prompt.toLowerCase();
  const promptLength = prompt.length;

  // Fast, general-purpose models (quick replies / high-throughput)
  selectedModels.add(MODELS['Llama 3.3 8B Instruct'].name); // lightweight, snappy
  selectedModels.add(MODELS['Grok 4 Fast'].name);           // fast + high-throughput

  // Intent-based routing for coding / technical work
  if (
    analysisResult.intent === 'code_generation' ||
    analysisResult.intent === 'debugging' ||
    analysisResult.intent === 'technical_explanation' ||
    analysisResult.intent === 'algorithm_help'
  ) {
    selectedModels.add(MODELS['Devstral Small 1.1'].name); // coding-specialized
    selectedModels.add(MODELS['Meta Llama 4 Maverick (free)'].name); // deep reasoning + code debugging
  }

  // Domain-based routing (business / science / engineering / education / math / research)
  const domainKeywords = ['business', 'science', 'engineering', 'education', 'productivity', 'gaming', 'lifestyle', 'reasoning', 'math', 'research'];
  const hasDomainKeyword =
    domainKeywords.some(keyword => lowerCasePrompt.includes(keyword)) ||
    analysisResult.domain_context !== 'general' ||
    domainKeywords.some(k => analysisResult.topic_keywords.includes(k));

  if (hasDomainKeyword) {
    selectedModels.add(MODELS['Meta Llama 4 Maverick (free)'].name); // multimodal + strong reasoning)
    selectedModels.add(MODELS['Gemini 2.0 Flash Experimental'].name); // best for very long context / multimodal
    selectedModels.add(MODELS['Grok 4 Fast'].name);
  }

  // Length / complexity-based routing (long-doc summarization, complex reasoning)
  if (analysisResult.intent === 'summarization' || analysisResult.intent === 'complex_reasoning' || promptLength > 500) {
    selectedModels.add(MODELS['Gemini 2.0 Flash Experimental'].name); // long-context specialist
    selectedModels.add(MODELS['Grok 4 Fast'].name); // huge context + throughput
    selectedModels.add(MODELS['Meta Llama 4 Maverick (free)'].name); // multimodal + strong reasoning)
    selectedModels.add(MODELS['Llama 3.3 8B Instruct'].name);       // quicker, cheaper alternative
  }

  // Creative / roleplay / storytelling tasks
  if (
    analysisResult.intent === 'creative_writing' ||
    analysisResult.intent === 'roleplay' ||
    analysisResult.domain_context === 'creative' ||
    analysisResult.domain_context === 'gaming'
  ) {
    selectedModels.add(MODELS['Llama 3.3 8B Instruct'].name); // snappy creative outputs
    selectedModels.add(MODELS['Meta Llama 4 Maverick (free)'].name);// richer reasoning & creativity
  }

  // Always prefer coding model as last step for code questions (ensure it's present)
  if (analysisResult.intent === 'code_generation' || analysisResult.intent === 'debugging') {
    selectedModels.add(MODELS['Devstral Small 1.1'].name);
  }

  return Array.from(selectedModels);
}

// --- Fallback Chain for failed requests (updated to the 5-model set) ---
function getFallbackModel(failedModel: string): string | null {
  const fallbackChain: { [key: string]: string[] } = {
    // Gemini long-context fallback chain
    [MODELS['Gemini 2.0 Flash Experimental'].name]: [
      MODELS['Grok 4 Fast'].name,
      MODELS['Llama 3.3 8B Instruct'].name,
    ],
    // Grok fallback chain
    [MODELS['Grok 4 Fast'].name]: [
      MODELS['Gemini 2.0 Flash Experimental'].name,
      MODELS['Meta Llama 4 Maverick (free)'].name,
    ],
    // Meta (reasoning) fallback chain
    [MODELS['Meta Llama 4 Maverick (free)'].name]: [
      MODELS['Gemini 2.0 Flash Experimental'].name,
      MODELS['Llama 3.3 8B Instruct'].name,
    ],
    // Llama (fast/light) fallback chain
    [MODELS['Llama 3.3 8B Instruct'].name]: [
      MODELS['Meta Llama 4 Maverick (free)'].name,
      MODELS['Devstral Small 1.1'].name,
    ],
    // Devstral (coding) fallback chain
    [MODELS['Devstral Small 1.1'].name]: [
      MODELS['Meta Llama 4 Maverick (free)'].name,
      MODELS['Llama 3.3 8B Instruct'].name,
    ],
  };

  const fallbacks = fallbackChain[failedModel] || null;
  return fallbacks ? fallbacks[0] : null;
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
  instructions.push(`**Enhanced Real-time Information Retrieval:** You can perform live web searches, for current events, definitions, and general information using Serper API, and integrate these findings seamlessly.`);
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

  // --- Multimodal Capabilities, Performance, and Tool Support ---
  // Note: These are high-level descriptions for the AI's understanding of its capabilities.
  // The code itself implements a subset of these features (e.g., text, vision via file analysis, web browsing).
  instructions.push(`--- Multimodal Capabilities ---`);
  instructions.push(`- Text: Can understand and generate human-like text (writing, editing, translating, summarizing, coding).`);
  instructions.push(`- Vision (Images): Can analyze and describe images, charts, documents, and screenshots by processing their content from file uploads.`);
  instructions.push(`- Audio: While not natively in this route, you can process speech from user input provided by the client side.`);
  instructions.push(`- Video (Limited): Some vision-based tasks include video frame analysis (not real-time video understanding).`);
  instructions.push(`--- Performance Enhancements ---`);
  instructions.push(`- Speed: Your routing system and parallel queries are designed to be much faster and more responsive.`);
  instructions.push(`- Accuracy: Your memory and instruction-following are improved by long-term memory and detailed system prompts.`);
  instructions.push(`- Efficiency: You are better at following instructions and keeping context over time.`);
  instructions.push(`--- Language & Communication ---`);
  instructions.push(`- Multilingual: You can understand and translate dozens of languages with high fluency.`);
  instructions.push(`- Real-time Conversation: Your voice mode offers fast response times, mimicking natural conversations.`);
  instructions.push(`- Tool Support: You can perform live web searches, file uploads and analysis, and geospatial lookups.`);
  instructions.push(`--- General Knowledge & Communication ---`);
  instructions.push(`- Answer questions on a wide range of topics.`);
  instructions.push(`- Explain concepts clearly and concisely.`);
  instructions.push(`- Summarize articles, documents, or long conversations.`);
  instructions.push(`- Translate between multiple languages.`);
  instructions.push(`- Correct grammar and spelling in any text.`);
  instructions.push(`- Edit & Improve writing style, tone, and structure.`);
  instructions.push(`- Roleplay or simulate conversations.`);
  instructions.push(`- Give advice (non-medical, non-legal) or provide coaching.`);
  instructions.push(`- Support creative writing like poems, stories, and scripts.`);
  instructions.push(`--- Coding & Development ---`);
  instructions.push(`- Write, debug, and explain code in many languages (Python, JavaScript, C++, HTML/CSS, SQL, etc.).`);
  instructions.push(`- Help with algorithms and data structures.`);
  instructions.push(`- Build full apps or scripts with explanations.`);
  instructions.push(`- Generate documentation and README files.`);
  instructions.push(`- Explain technical concepts (APIs, databases, software design patterns).`);
  instructions.push(`- Run Python in a live environment (Note: this capability is dependent on a live execution tool that may not be available in all contexts).`);
  instructions.push(`--- Specialized Domains ---`);
  instructions.push(`- Reasoning & Math: Solve math problems (algebra, calculus, statistics, etc.).`);
  instructions.push(`- Assist with logic puzzles or word problems.`);
  instructions.push(`- Break down complex reasoning step by step.`);
  instructions.push(`- Business: marketing, strategy, SWOT analysis, customer communications.`);
  instructions.push(`- Science & Engineering: physics, chemistry, biology, systems design.`);
  instructions.push(`- Education & Tutoring: homework help, lesson planning, quizzes.`);
  instructions.push(`- Productivity: mental models like Zettelkasten, GTD, Second Brain.`);
  instructions.push(`- Gaming: build characters, design strategies, develop storylines.`);
  instructions.push(`- Lifestyle Help: travel planning, resume writing, meal prep, fitness routines.`);
  instructions.push(`--- Customization ---`);
  instructions.push(`- Memory (Optional): You can remember preferences and details across chats (if enabled) using Supabase.`);

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
    const aRelevance = userAnalysisResult.topic_keywords.filter(keyword =>
      a.content.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    const bRelevance = userAnalysisResult.topic_keywords.filter(keyword =>
      b.content.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    // Favor more relevant responses
    if (aRelevance !== bRelevance) {
      return bRelevance - aRelevance;
    }

    // Favor longer, more detailed responses for complex intents
    if (
      userAnalysisResult.intent === 'complex_reasoning' ||
      userAnalysisResult.intent === 'summarization'
    ) {
      return b.content.length - a.content.length;
    }

    // For quick tasks, favor faster responses
    if (
      userAnalysisResult.intent === 'hello' ||
      userAnalysisResult.intent === 'greeting' ||
      userAnalysisResult.intent === 'simple_question'
    ) {
      return a.latency - b.latency;
    }

    // Default to the fastest model
    return a.latency - b.latency;
  });

  // Take the best response's content
  const bestResponse = sortedResponses[0];
  console.log(
    `✅ Selected best response from model: ${bestResponse.modelName} (Latency: ${bestResponse.latency.toFixed(2)}ms)`
  );
  return bestResponse.content;
}

export async function POST(req: Request) {
  // Get the content type from the request headers
  const contentType = req.headers.get('content-type');

  let prompt: string | undefined;
  let file: File | null = null;
  let reset: boolean = false;
  let userName: string | undefined;
  let clientPersonalityProfile: any = null;
  let chatSessionId: string | undefined;
  let messages: any[] = [];
  let isRegenerating: boolean = false;

  // Dynamically handle request body based on content type
  try {
    if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt = formData.get('prompt')?.toString();
      file = formData.get('file') as File | null;
      reset = formData.get('reset') === 'true';
      userName = formData.get('userName')?.toString();
      clientPersonalityProfile = formData.get('personalityProfile')
        ? JSON.parse(formData.get('personalityProfile')?.toString() || '{}')
        : null;
      chatSessionId = formData.get('chatSessionId')?.toString();
      messages = formData.get('messages')
        ? JSON.parse(formData.get('messages')?.toString() || '[]')
        : [];
      isRegenerating = formData.get('isRegenerating') === 'true';

      // ✅ NEW refinedPrompt handling
      const refined = formData.get('refinedPrompt')?.toString()?.trim() || '';
      prompt = refined.length > 0 ? refined : prompt;
    } else if (contentType?.includes('application/json')) {
      const jsonBody = await req.json();
      prompt = jsonBody.prompt;
      reset = jsonBody.reset;
      userName = jsonBody.userName;
      clientPersonalityProfile = jsonBody.personalityProfile;
      chatSessionId = jsonBody.chatSessionId;
      messages = jsonBody.messages;
      isRegenerating = jsonBody.isRegenerating;
      file = null; // No file in JSON body

      // ✅ NEW refinedPrompt handling
      const refined = jsonBody.refinedPrompt?.trim() || '';
      prompt = refined.length > 0 ? refined : prompt;
    } else {
      console.error(`❌ Unsupported Content-Type: ${contentType}`);
      return NextResponse.json(
        { content: '❌ Unsupported Content-Type' },
        { status: 415 }
      );
    }
  } catch (error) {
    console.error('❌ Error parsing request body:', error);
    return NextResponse.json(
      { content: '❌ Invalid request body' },
      { status: 400 }
    );
  }

  console.log('🧠 Final prompt used:', prompt);

  let uploadedFileContent = '';

  // 2. File Validation and 3. Read File Content
  if (file && file.name && file.size > 0) {
    console.log(`📁 File uploaded: ${file.name}, Size: ${file.size} bytes`);

    // File Size Limit
    if (file.size > MAX_FILE_SIZE) {
      console.error(
        `❌ File too large: ${file.size} bytes. Max size is ${MAX_FILE_SIZE} bytes.`
      );
      return NextResponse.json(
        {
          content:
            '❌ The uploaded file is too large. Please upload a file smaller than 10MB.',
        },
        { status: 413 }
      );
    }

    const fileExtension = path.extname(file.name).toLowerCase();

    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      if (fileExtension === '.txt') {
        uploadedFileContent = fileBuffer.toString('utf8');
      } else if (fileExtension === '.pdf') {
        const data = await pdf(fileBuffer);
        uploadedFileContent = data.text;
      } else if (fileExtension === '.docx') {
        const data = await mammoth.extractRawText({ buffer: fileBuffer });
        uploadedFileContent = data.value;
      } else {
        console.warn(`⚠️ Unsupported file type: ${fileExtension}`);
        return NextResponse.json(
          {
            content:
              '⚠️ Unsupported file type. Please upload a .txt, .pdf, or .docx file.',
          },
          { status: 400 }
        );
      }


      // Limit extremely large file text to prevent token overflow
const MAX_EXTRACTED_CHARS = 8000; // roughly ~2000 tokens
if (uploadedFileContent.length > MAX_EXTRACTED_CHARS) {
  console.log(`⚠️ Truncating long file content (${uploadedFileContent.length} chars).`);
  uploadedFileContent = uploadedFileContent.slice(0, MAX_EXTRACTED_CHARS) + "\n...[truncated]";
}

// Optional: Add a quick auto-summary to help the model
const summaryPrompt = `
You are Quirra, summarize the following text in under 5 bullet points:
${uploadedFileContent.slice(0, 3000)}
`;

try {
  const summaryResponse = await callModel({
    messages: [{ role: "user", content: summaryPrompt }],
    model: "gpt-4o-mini", // or one of your existing models
    temperature: 0.3,
    max_tokens: 300,
  });
  uploadedFileContent = `Summary of File:\n${summaryResponse}\n\nFull Extracted Text:\n${uploadedFileContent}`;
  console.log("✅ File summarized successfully before passing to main prompt.");
} catch (err) {
  console.warn("⚠️ Could not auto-summarize file. Continuing with raw text.");
}


      // 4. Combine File Content with User Prompt
      prompt = `[File Content]\n${uploadedFileContent}\n\n[User Prompt]\n${prompt}`;
      console.log('✅ File content successfully extracted and combined.');
    } catch (err) {
      console.error('❌ Error parsing file:', err);
      return NextResponse.json(
        {
          content:
            '❌ Failed to process the uploaded file. Please ensure it is not corrupted and try again.',
        },
        { status: 500 }
      );
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

    const estimatedInputTokens = Math.ceil((prompt?.length || 0) / 4);
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
    
    // Ensure prompt is not undefined before proceeding
    if (!prompt) {
      return NextResponse.json({ content: '⚠️ Please enter a message to chat with Quirra.' }, { status: 400 });
    }

  // --- Step: Apply Quick Command Transformation (Idea, Design, Study, etc.) ---
let refinedPrompt = prompt;
let commandType: string | undefined;

try {
  // Try to extract commandType from body if the frontend sends it
  if (contentType?.includes('multipart/form-data')) {
    const formData = await req.formData();
    commandType = formData.get('commandType')?.toString();
  } else if (contentType?.includes('application/json')) {
    // The body was already parsed earlier, so we just reuse it if available
    commandType = (typeof (req as any).body === 'object' && (req as any).body.commandType)
      ? (req as any).body.commandType
      : undefined;
  }

  if (commandType && COMMAND_PROMPT_MAP[commandType]) {
    refinedPrompt = COMMAND_PROMPT_MAP[commandType](prompt || '');
    console.log(`🎯 Quick Command Applied: ${commandType}`);
  }
} catch (err) {
  console.warn('⚠️ Failed to extract commandType from request:', err);
}


// 1. Receive User Input & 2. Intent Classification + Confidence Scoring
console.log('🧠 Analyzing user message...');
const userAnalysisResult: MessageAnalysis & { confidence?: number } = await analyzeMessage(refinedPrompt);
console.log('✅ User message analysis complete:', userAnalysisResult);

if (userAnalysisResult.confidence && userAnalysisResult.confidence < 0.7) {
  return NextResponse.json({
    content:
      "I'm not quite sure I understand. Could you please clarify what you mean? For example, are you asking for information, a solution, or something else?"
  }, { status: 200 });
}

const { data: historyData, error: fetchHistoryError } = await supabase
  .from('messages')
  .select('role, content')
  .eq('user_id', userId)
  .eq('chat_session_id', chatSessionId)
  .order('created_at', { ascending: true })
  .limit(12);
if (fetchHistoryError) {
  console.error('❌ Supabase Error: Failed to fetch message history:', fetchHistoryError.message);
}

let memoryContext = '';
let emotionalTrendSummary: string | null = null;
const { data: generalMemoryData, error: fetchGeneralMemoryError } = await supabase
  .from('memory')
  .select('content, key')
  .eq('user_id', userId)
  .order('timestamp', { ascending: false })
  .limit(5);

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
const { data: focusData, error: fetchFocusError } = await supabase
  .from('daily_focus')
  .select('focus_text, created_at')
  .eq('user_id', userId)
  .eq('date', today)
  .single();
if (fetchFocusError && fetchFocusError.code !== 'PGRST116') {
  console.error('❌ Supabase Error: Failed to fetch daily focus:', fetchFocusError.message);
} else if (focusData) {
  dailyFocus = focusData;
}

let recentMoodLogs: MoodLog[] = [];
const { data: moodLogsData, error: fetchMoodLogsError } = await supabase
  .from('mood_logs')
  .select('mood_label, sentiment_score, timestamp')
  .eq('user_id', userId)
  .order('timestamp', { ascending: false })
  .limit(3);
if (fetchMoodLogsError) {
  console.error('❌ Supabase Error: Failed to fetch mood logs:', fetchMoodLogsError.message);
} else if (moodLogsData) {
  recentMoodLogs = moodLogsData;
}

let activeGoals: UserGoal[] = [];
const { data: goalsData, error: fetchGoalsError } = await supabase
  .from('user_goals')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active')
  .order('created_at', { ascending: true });
if (fetchGoalsError) {
  console.error('❌ Supabase Error: Failed to fetch active goals:', fetchGoalsError.message);
} else if (goalsData) {
  activeGoals = goalsData as UserGoal[];
}

let userPersonalityProfile: PersonalityProfile | null = clientPersonalityProfile;
if (!userPersonalityProfile) {
  const { data: profileData, error: fetchProfileError } = await supabase
    .from('profiles')
    .select('personality_profile')
    .eq('id', userId)
    .single();
  if (fetchProfileError && fetchProfileError.code !== 'PGRST116') {
    console.error('❌ Supabase Error: Failed to fetch user personality profile:', fetchProfileError.message);
  } else if (profileData?.personality_profile) {
    userPersonalityProfile = profileData.personality_profile as PersonalityProfile;
  }
}

const { data: currentProfileData, error: fetchCurrentProfileError } = await supabase
  .from('profiles')
  .select('last_proactive_checkin_at')
  .eq('id', userId)
  .single();
let initialProactiveMessage: string | null = null;

if (currentProfileData !== null && !fetchCurrentProfileError) {
  const lastCheckinAt = currentProfileData?.last_proactive_checkin_at ? new Date(currentProfileData.last_proactive_checkin_at) : null;
  const now = new Date();
  const hoursSinceLastCheckin = lastCheckinAt ? (now.getTime() - lastCheckinAt.getTime()) / (1000 * 60 * 60) : Infinity;

  if (hoursSinceLastCheckin >= PROACTIVE_CHECKIN_INTERVAL_HOURS && emotionalTrendSummary) {
    console.log(`🧠 Proactive check-in due for user ${userId}. Generating message...`);
    try {
      const proactiveModel = MODELS['Gemini 2.0 Flash Experimental'].name;
      const proactiveMessages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are Quirra, an empathetic AI assistant. Based on the user's recent emotional trends, craft a very short (1-2 sentences), gentle, and supportive proactive check-in message. It should acknowledge their emotional state and offer general support or suggest checking in with a tool (like Daily Focus, Mood Logger, or Goal Setting). Do NOT ask direct questions that demand an immediate answer. Do NOT mention "emotional trends" directly. Just a warm, subtle check-in.`
        },
        {
          role: 'user',
          content: `Based on this emotional trend summary: "${emotionalTrendSummary}", generate a proactive check-in message for the user.`
        }
      ];

      const proactiveContent = await callModel({
        messages: proactiveMessages,
        model: proactiveModel,
        temperature: 0.7,
        max_tokens: 120
      }).catch((e) => {
        console.warn('⚠️ Proactive callModel failed:', e?.message || e);
        return null;
      });

      if (proactiveContent) {
        initialProactiveMessage = String(proactiveContent).trim();
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
        console.warn('⚠️ Proactive message generation returned no content.');
      }
    } catch (proactiveError: any) {
      console.error('❌ Error generating proactive message:', proactiveError.message || proactiveError);
    }
  }
}

// 3️⃣ Image Generation (if user requested image creation)
if (userAnalysisResult.intent === "image_generation" || refinedPrompt.toLowerCase().includes("generate image")) {
  console.log("🎨 Detected image generation intent");

  const imagePrompt = refinedPrompt.replace(/generate image/gi, "").trim();
  const model = "stability/stable-diffusion-xl-base-1.0"; // via OpenRouter

  try {
    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: imagePrompt || refinedPrompt,
        size: "1024x1024",
      }),
    });

    const data = await response.json();
    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) throw new Error("No image URL returned.");

    console.log("✅ Image generated successfully:", imageUrl);

    return NextResponse.json({
      type: "image",
      content: `Here’s your generated image for: "${imagePrompt}"`,
      imageUrl,
    });
  } catch (err: any) {
    console.error("❌ Image generation failed:", err.message);
    return NextResponse.json({
      content: "Sorry, I couldn’t generate the image right now. Please try again later.",
      error: err.message,
    }, { status: 500 });
  }
}


const conversationHistoryForLLM: ChatMessage[] = Array.isArray(messages)
  ? messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }))
  : [];

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
      { role: 'user' as const, content: refinedPrompt },
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
      console.log('🔍 Performing live search with Serper for prompt:', refinedPrompt);
      try {
        const searchRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': serperKey },
          body: JSON.stringify({ q: refinedPrompt }),
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
            messagesForLLM.push({ role: 'system' as const, content: `(Internal Note: Serper search for "${prompt}" failed. Answer based on general knowledge and context.)` });
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

    // --- 3. Dispatch to All LLM Models (Sequential callModel loop + fusion + SSE) ---
const modelsToQuery = getRelevantModels(String(refinedPrompt), userAnalysisResult);
console.log(`🤖 Dispatching prompt to models: ${modelsToQuery.join(', ')}`);

// We'll call callModel for each model (sequentially to avoid hammering provider),
// collect responses and attempt a single fallback per failed model.
const modelResponses: Array<{ modelName: string; content: string; latency: number }> = [];

for (const modelName of modelsToQuery) {
  try {
    const t0 = performance.now();
    const content = await callModel({
      messages: messagesForLLM,
      model: modelName,
      temperature: 0.7,
      max_tokens: 800,
      timeoutMs: 40000,
      maxAttempts: 2
    });
    const latency = performance.now() - t0;
    modelResponses.push({ modelName, content: String(content), latency });
    console.log(`✅ Model ${modelName} succeeded (latency ${latency.toFixed(0)}ms).`);
  } catch (err: any) {
    console.warn(`⚠️ Model ${modelName} failed:`, err?.message || err);
    // Try one fallback model if available
    const fallbackModel = getFallbackModel(modelName);
    if (fallbackModel) {
      try {
        const t0 = performance.now();
        const content = await callModel({
          messages: messagesForLLM,
          model: fallbackModel,
          temperature: 0.7,
          max_tokens: 800,
          timeoutMs: 40000,
          maxAttempts: 2
        });
        const latency = performance.now() - t0;
        modelResponses.push({ modelName: fallbackModel, content: String(content), latency });
        console.log(`🔁 Fallback ${fallbackModel} succeeded for ${modelName} (latency ${latency.toFixed(0)}ms).`);
      } catch (err2: any) {
        console.warn(`⚠️ Fallback ${fallbackModel} also failed:`, err2?.message || err2);
      }
    }
  }
}

// ----- Response selection, token estimation, SSE stream, DB saves -----
if (modelResponses.length === 0) {
  console.error('❌ All model calls failed.');
  return NextResponse.json({
    content: '🚨 All AI models failed to generate a response. Please try again later.'
  }, { status: 500 });
}

// Evaluate & fuse responses
let bestResponseContent: string;
try {
  bestResponseContent = evaluateAndFuseResponses(modelResponses, String(prompt), userAnalysisResult);
  if (!bestResponseContent || bestResponseContent.trim().length === 0) {
    bestResponseContent = modelResponses[0]?.content || '';
  }
} catch (err) {
  console.warn('⚠️ fusion step failed, using first model response:', err);
  bestResponseContent = modelResponses[0]?.content || '';
}

// Estimate tokens used (approximation)
const estimateTokens = (text: string | undefined | null) => {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
};

let totalOutputTokens = modelResponses.reduce((acc, r) => acc + estimateTokens(r.content), 0);

// const totalOutputTokens = estimateTokens(bestResponseContent);

const encoder = new TextEncoder();

const readableStream = new ReadableStream({
  async start(controller) {
    try {
      // 1) Send proactive message first if present
      if (initialProactiveMessage) {
        const proactiveMessageId = crypto.randomUUID();
        controller.enqueue(encoder.encode(`data:${JSON.stringify({
          type: 'proactive_message',
          id: proactiveMessageId,
          content: initialProactiveMessage,
          chatSessionId,
          created_at: new Date().toISOString()
        })}\n\n`));

        try {
          await saveMessage(supabase, userId, chatSessionId, 'assistant', initialProactiveMessage);
        } catch (saveErr) {
          console.error('❌ Failed to save proactive message:', saveErr);
        }
      }

      // 2) Send fused LLM response
      controller.enqueue(encoder.encode(`data:${JSON.stringify({
        type: 'llm_response_chunk',
        content: bestResponseContent
      })}\n\n`));

      // 3) End of stream
      controller.enqueue(encoder.encode('data:[DONE]\n\n'));

      // 4) Save response to DB
      if (bestResponseContent && bestResponseContent.trim().length > 0) {
        try {
          await saveMessage(supabase, userId, chatSessionId, 'assistant', bestResponseContent);
        } catch (saveErr) {
          console.error('❌ Failed to save assistant message:', saveErr);
        }
      }

      // 5) Update usage
      try {
        const finalTokensUsed =
          (typeof estimatedInputTokens === 'number' ? estimatedInputTokens : estimateTokens(prompt)) +
          totalOutputTokens;

        const { error: updateUsageError } = await supabase
          .from('profiles')
          .update({
            daily_token_usage: (currentDailyTokenUsage || 0) + finalTokensUsed,
            last_usage_date: today
          })
          .eq('id', userId);

        if (updateUsageError) {
          console.error('❌ Supabase Error: Failed to update daily token usage after response:', updateUsageError.message);
        } else {
          console.log(
            `✅ User ${userId} daily token usage updated. Used ${finalTokensUsed} tokens. New total: ${(currentDailyTokenUsage || 0) + finalTokensUsed}/${DAILY_TOKEN_LIMIT}`
          );
        }
      } catch (usageErr) {
        console.error('❌ Error updating usage in Supabase:', usageErr);
      }
    } catch (streamErr) {
      console.error('❌ Error in SSE stream start:', streamErr);
    } finally {
      controller.close();
    }
  }
});

// Return SSE response
return new NextResponse(readableStream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive'
  }
});

// ✅ Close outer try/catch and POST function
} catch (err: any) {
  console.error('❌ Critical API Route Error:', err);
  return NextResponse.json({
    content: `🚨 An unexpected critical error occurred: ${err.message}. Please try again later.`
  }, { status: 500 });
}
}
