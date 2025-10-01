// src/utils/analyzeMessage.ts

// Define the expanded structure for the analysis result
export interface MessageAnalysis {
  mood: string; // e.g., happy, sad, frustrated, curious, neutral, confused, excited - this will now represent the *overall* user emotional state
  tone: string; // e.g., formal, casual, aggressive, warm, sarcastic, objective, passive-aggressive, appreciative
  intent: string; // e.g., question, complaint, feedback, casual_talk, instruction, request, information_seeking, problem_reporting, greeting, translation, summarization, brainstorming, problem_solving, self-reflection, geocoding, directions, matrix, isochrones, elevation
  sentiment_score: number; // -1.0 (very negative) to 1.0 (very positive)
  sentiment_label: 'positive' | 'negative' | 'neutral' | 'mixed'; // Categorical sentiment
  formality_score: number; // 0.0 (very casual) to 1.0 (very formal)
  urgency_score: number; // 0.0 (not urgent) to 1.0 (very urgent)
  politeness_score: number; // 0.0 (very impolite) to 1.0 (very polite)
  topic_keywords: string[]; // e.g., ["math", "homework", "project"], 3-5 keywords
  domain_context: string; // e.g., "education", "technical_support", "customer_service", "personal", "business", "creative", "legal", "medical", "wellness", "self-improvement", "general", "geospatial"
  detected_language: string; // ISO 639-1 code (e.g., 'en', 'es', 'ar')

  // NEW: More granular emotion detection
  emotions: { label: string, score: number }[]; // Array of detected emotions with their confidence scores (0.0 to 1.0)
  dominant_emotion: string | null; // The emotion with the highest score, or null if none are strong
  overall_emotional_intensity: number; // A composite score for how emotionally charged the message is (0.0 to 1.0)

  // New fields for specific NLP tasks, like translation or summarization
  source_text?: string | null; // Explicitly allow null
  target_language?: string | null; // Explicitly allow null

  // NEW: Fields for OpenRouteService API integration
  location_query?: string | null; // For geocoding intent
  start_location?: string | null; // For directions, matrix intents
  end_location?: string | null; // For directions intent
  travel_mode?: 'driving-car' | 'walking' | 'cycling-road' | 'cycling-mountain' | 'cycling-electric' | 'foot-walking' | 'foot-hiking' | null; // For directions, matrix, isochrones
  locations_for_matrix?: string[] | null; // For matrix intent (array of addresses)
  center_location?: string | null; // For isochrones intent
  range_values?: number[] | null; // For isochrones intent (e.g., [300, 600, 900] seconds)
  range_type?: 'time' | 'distance' | null; // For isochrones intent
  locations_for_elevation?: string[] | null; // For elevation intent (array of addresses)
}

// Default analysis to return in case of errors or missing API key
export const DEFAULT_ANALYSIS: MessageAnalysis = {
  mood: "neutral",
  tone: "neutral",
  intent: "unknown",
  sentiment_score: 0,
  sentiment_label: "neutral",
  formality_score: 0.5,
  urgency_score: 0.0,
  politeness_score: 0.5,
  topic_keywords: [],
  domain_context: "general",
  detected_language: "en", // Default to English

  // Default values for new emotional fields
  emotions: [],
  dominant_emotion: null,
  overall_emotional_intensity: 0.0,

  // Default values for new optional fields
  source_text: null, // Default to null
  target_language: null, // Default to null

  // Default values for ORS fields
  location_query: null,
  start_location: null,
  end_location: null,
  travel_mode: null,
  locations_for_matrix: null,
  center_location: null,
  range_values: null,
  range_type: null,
  locations_for_elevation: null,
};

// Define the comprehensive list of emotional categories QuirraAI should detect
const EMOTIONAL_CATEGORIES = [
  "joy", "sadness", "frustration", "anxiety", "curiosity",
  "confusion", "motivation", "gratitude", "anger", "disappointment",
  "excitement", "hope", "neutral", "surprise", "fear", "trust", "anticipation",
  "relief", "regret", "empathy", "sarcasm", "skepticism", "stress", "calm"
];

// Define the comprehensive list of intents QuirraAI should detect
const INTENT_CATEGORIES = [
  "question", "complaint", "feedback", "casual_talk", "instruction", "request",
  "information_seeking", "problem_reporting", "greeting", "clarification",
  "translation", "summarization", "brainstorming", "problem_solving",
  "self-reflection", "geocoding", "directions", "matrix", "isochrones", "elevation",
  "planning", "scheduling", "recommendation", "comparison", "definition"
];

// Define the comprehensive list of domain contexts QuirraAI should detect
const DOMAIN_CONTEXT_CATEGORIES = [
  "education", "technical_support", "customer_service", "personal", "business",
  "creative", "legal", "medical", "wellness", "self-improvement", "general",
  "geospatial", "travel", "finance", "technology", "science", "arts", "history", "sports"
];

/**
 * Analyzes the user's message using OpenRouter API to determine tone, intent, and emotions.
 * It requests a structured JSON output directly from the LLM based on a detailed prompt.
 * @param message The user's input message.
 * @returns A Promise that resolves to a MessageAnalysis object.
 */
export async function analyzeMessage(message: string): Promise<MessageAnalysis> {
  // 1. Validate API Key
  const openRouterApiKey = process.env.OPENROUTER_API_KEY; // Changed to OpenRouter API Key
  if (!openRouterApiKey) {
    console.error("❌ OPENROUTER_API_KEY is not set. Cannot perform message analysis.");
    return DEFAULT_ANALYSIS;
  }

  // 2. Construct the detailed prompt for the LLM to return JSON
  const analysisPrompt = `Analyze the following user message comprehensively and provide a JSON output. Ensure all fields from the schema below are present, even if empty arrays or default values. Extract specific parameters for geospatial queries if applicable.

  Message: "${message}"

  JSON Output Schema:
  {
    "mood": "string", // "positive", "negative", "neutral", "mixed", "reflective", "assertive", "inquisitive" - Overall emotional state.
    "tone": "string", // "formal", "casual", "aggressive", "warm", "sarcastic", "objective", "passive-aggressive", "appreciative", "instructional", "interrogative", "empathetic", "frustrated" - Dominant tone.
    "intent": "string", // One of [${INTENT_CATEGORIES.map(e => `"${e}"`).join(', ')}] - Primary purpose.
    "sentiment_score": "number", // -1.0 (very negative) to 1.0 (very positive), 0.0 is neutral.
    "sentiment_label": "string", // "positive", "negative", "neutral", "mixed" - Categorical sentiment.
    "formality_score": "number", // 0.0 (very casual) to 1.0 (very formal).
    "urgency_score": "number", // 0.0 (not urgent) to 1.0 (very urgent).
    "politeness_score": "number", // 0.0 (very impolite) to 1.0 (very polite).
    "topic_keywords": ["string"], // Array of 3 to 5 highly relevant keywords or short phrases. E.g., ["project deadline", "API integration"].
    "domain_context": "string", // One of [${DOMAIN_CONTEXT_CATEGORIES.map(e => `"${e}"`).join(', ')}] - General context/domain.
    "detected_language": "string", // ISO 639-1 two-letter code (e.g., 'en', 'es', 'fr', 'ar', 'zh', 'de', 'ja').

    "emotions": [ // Array of up to 3 distinct emotions detected, each with a label and a confidence score. Only include emotions with a score > 0.1.
      { "label": "string", "score": "number" } // Label from [${EMOTIONAL_CATEGORIES.map(e => `"${e}"`).join(', ')}] and score 0.0 to 1.0.
    ],
    "dominant_emotion": "string | null", // The single most prominent emotion detected, or null if no strong emotion is present (all scores below 0.3).
    "overall_emotional_intensity": "number", // A numerical score from 0.0 (very low emotional charge) to 1.0 (very high emotional charge).

    "source_text": "string | null", // If intent is 'translation' or 'summarization', the specific text to be processed. Otherwise, null.
    "target_language": "string | null", // If intent is 'translation', the ISO 639-1 code for the target language. Otherwise, null.

    // Geospatial fields (populate ONLY if intent is geospatial)
    "location_query": "string | null", // e.g., "Eiffel Tower", "London" - for geocoding
    "start_location": "string | null", // e.g., "Times Square" - for directions, matrix
    "end_location": "string | null", // e.g., "Statue of Liberty" - for directions
    "travel_mode": "string | null", // "driving-car", "walking", "cycling-road", "cycling-mountain", "cycling-electric", "foot-walking", "foot-hiking"
    "locations_for_matrix": ["string"] | null, // e.g., ["Paris", "London", "Berlin"] - for matrix
    "center_location": "string | null", // e.g., "Central Park" - for isochrones
    "range_values": ["number"] | null, // e.g., [300, 600, 900] (seconds for time, meters for distance) - for isochrones
    "range_type": "string | null", // "time" or "distance" - for isochrones
    "locations_for_elevation": ["string"] | null // e.g., ["Mount Everest", "Death Valley"] - for elevation
  }

  Example of a neutral response structure if no strong analysis is possible:
  {
    "mood": "neutral",
    "tone": "neutral",
    "intent": "conversational",
    "sentiment_score": 0,
    "sentiment_label": "neutral",
    "formality_score": 0.5,
    "urgency_score": 0.0,
    "politeness_score": 0.5,
    "topic_keywords": [],
    "domain_context": "general",
    "detected_language": "en",
    "emotions": [],
    "dominant_emotion": null,
    "overall_emotional_intensity": 0.0,
    "source_text": null,
    "target_language": null,
    "location_query": null,
    "start_location": null,
    "end_location": null,
    "travel_mode": null,
    "locations_for_matrix": null,
    "center_location": null,
    "range_values": null,
    "range_type": null,
    "locations_for_elevation": null
  }

  Strictly adhere to the JSON format. Do not include any additional text outside the JSON object.
  `;

  try {
    // 3. Make the API call to OpenRouter
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", { // Changed to OpenRouter API endpoint
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        // Add OpenRouter specific headers for attribution
        "HTTP-Referer": "YOUR_SITE_URL_HERE", // Replace with your actual site URL
        "X-Title": "Quirra AI Prototype - Analysis", // Replace with your app title
      },
      body: JSON.stringify({
        model: "Meta Llama 4 Maverick (free)", // Using a capable free model for analysis
        messages: [{ role: "user", content: analysisPrompt }],
        temperature: 0.1, // Low temperature for consistent and accurate JSON output
        max_tokens: 700, // Sufficient tokens for the analysis JSON
        response_format: { type: "json_object" } // Request JSON output directly
      }),
      signal: AbortSignal.timeout(7000) // 7 second timeout for analysis
    });

    // 4. Handle non-OK HTTP responses from OpenRouter API
    if (!res.ok) {
      const errorData = await res.json();
      console.error(`❌ OpenRouter Analysis API HTTP error: ${res.status} ${res.statusText}`, errorData);
      throw new Error(`OpenRouter Analysis API error: ${errorData.error?.message || res.statusText}`);
    }

    const data = await res.json();

    // 5. Validate OpenRouter response structure
    const analysisString = data.choices?.[0]?.message?.content;

    if (!analysisString) {
      console.error("❌ OpenRouter analysis returned no content or unexpected structure:", data);
      throw new Error("Invalid response structure from OpenRouter API: Expected JSON content.");
    }

    // 6. Parse and return the analysis
    try {
      const parsedAnalysis: MessageAnalysis = JSON.parse(analysisString);

      // Post-processing and validation to ensure data consistency
      if (!Array.isArray(parsedAnalysis.emotions)) {
        parsedAnalysis.emotions = [];
      }
      // Filter out low-score emotions to keep the array clean and relevant
      parsedAnalysis.emotions = parsedAnalysis.emotions.filter(e => e.score > 0.1);

      // Derive dominant_emotion and overall_emotional_intensity if not perfectly provided by LLM
      let dominantEmotion = null;
      let overallEmotionalIntensity = 0;
      if (parsedAnalysis.emotions.length > 0) {
        const sortedEmotions = [...parsedAnalysis.emotions].sort((a, b) => b.score - a.score);
        dominantEmotion = sortedEmotions[0].label;
        overallEmotionalIntensity = sortedEmotions[0].score;
      }
      // Use provided value if it's not null/undefined, otherwise fallback
      parsedAnalysis.dominant_emotion = parsedAnalysis.dominant_emotion !== undefined ? parsedAnalysis.dominant_emotion : dominantEmotion;
      parsedAnalysis.overall_emotional_intensity = parsedAnalysis.overall_emotional_intensity !== undefined ? parsedAnalysis.overall_emotional_intensity : overallEmotionalIntensity;

      // Ensure sentiment_label is one of the allowed values
      const allowedSentimentLabels = ['positive', 'negative', 'neutral', 'mixed'];
      if (!allowedSentimentLabels.includes(parsedAnalysis.sentiment_label)) {
        parsedAnalysis.sentiment_label = 'neutral'; // Default if unexpected
      }

      // Ensure optional fields are explicitly null if not provided by LLM
      // This handles cases where the LLM might omit them or set them to undefined
      parsedAnalysis.source_text = parsedAnalysis.source_text === undefined ? null : parsedAnalysis.source_text;
      parsedAnalysis.target_language = parsedAnalysis.target_language === undefined ? null : parsedAnalysis.target_language;

      // Ensure ORS specific fields are null if not relevant to the intent
      const geospatialIntents = ['geocoding', 'directions', 'matrix', 'isochrones', 'elevation'];
      if (!geospatialIntents.includes(parsedAnalysis.intent)) {
        parsedAnalysis.location_query = null;
        parsedAnalysis.start_location = null;
        parsedAnalysis.end_location = null;
        parsedAnalysis.travel_mode = null;
        parsedAnalysis.locations_for_matrix = null;
        parsedAnalysis.center_location = null;
        parsedAnalysis.range_values = null;
        parsedAnalysis.range_type = null;
        parsedAnalysis.locations_for_elevation = null;
      } else {
        // For geospatial intents, ensure relevant fields are explicitly null if not provided by LLM
        parsedAnalysis.location_query = parsedAnalysis.location_query === undefined ? null : parsedAnalysis.location_query;
        parsedAnalysis.start_location = parsedAnalysis.start_location === undefined ? null : parsedAnalysis.start_location;
        parsedAnalysis.end_location = parsedAnalysis.end_location === undefined ? null : parsedAnalysis.end_location;
        parsedAnalysis.travel_mode = parsedAnalysis.travel_mode === undefined ? null : parsedAnalysis.travel_mode;
        parsedAnalysis.locations_for_matrix = parsedAnalysis.locations_for_matrix === undefined ? null : parsedAnalysis.locations_for_matrix;
        parsedAnalysis.center_location = parsedAnalysis.center_location === undefined ? null : parsedAnalysis.center_location;
        parsedAnalysis.range_values = parsedAnalysis.range_values === undefined ? null : parsedAnalysis.range_values;
        parsedAnalysis.range_type = parsedAnalysis.range_type === undefined ? null : parsedAnalysis.range_type;
        parsedAnalysis.locations_for_elevation = parsedAnalysis.locations_for_elevation === undefined ? null : parsedAnalysis.locations_for_elevation;
      }


      return parsedAnalysis;

    } catch (parseError) {
      console.error("❌ Failed to parse OpenRouter analysis JSON:", parseError, "Raw analysis string:", analysisString); // Changed from OpenAI
      // Fallback to default analysis if parsing fails
      return DEFAULT_ANALYSIS;
    }

  } catch (apiError: any) {
    console.error("❌ Error during communication with OpenRouter API for analysis or unexpected response:", apiError.message); // Changed from OpenAI
    // Return default analysis on API communication errors
    return DEFAULT_ANALYSIS;
  }
}