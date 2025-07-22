// utils/analyzeMessage.ts

// Define the expected structure for the analysis result
interface MessageAnalysis {
  mood: string;
  tone: string;
  intent: string;
  emotion_score?: number; // Numerical sentiment: -1.0 (very negative) to 1.0 (very positive)
  formality_score?: number; // Numerical formality: 0.0 (very casual) to 1.0 (very formal)
}

export async function analyzeMessageTone(message: string): Promise<MessageAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set.");
    // Return a default analysis if the API key is missing
    return { mood: "neutral", tone: "neutral", intent: "unknown", emotion_score: 0, formality_score: 0.5 };
  }

  // Enhanced prompt to also request a formality score
  const promptMessages = [
    {
      role: "system",
      content: `You are an expert emotion, tone, and communication analyst.
      Given a user message, accurately identify the user's:
      - Mood (e.g., happy, sad, frustrated, curious)
      - Tone (e.g., formal, casual, aggressive, warm)
      - Intent (e.g., question, complaint, feedback, casual talk)
      - Sentiment score ranging from -1.0 (very negative) to 1.0 (very positive), where 0.0 is neutral.
      - Formality score ranging from 0.0 (very casual) to 1.0 (very formal), where 0.5 is neutral.

      Respond ONLY with a JSON object. Ensure the JSON is perfectly valid and directly parseable.
      The JSON object MUST have the following keys: "mood", "tone", "intent", "emotion_score", and "formality_score".`
    },
    {
      role: "user",
      content: `Message: """${message}"""`
    }
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o", // gpt-4o is excellent for structured output and function calling
        messages: promptMessages,
        temperature: 0.1, // Lower temperature for more consistent and factual analysis
        response_format: { type: "json_object" } // Crucial for ensuring JSON output
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("❌ OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || res.statusText}`);
    }

    const data = await res.json();

    // Check if the expected message content exists
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
      console.error("❌ OpenAI API response missing expected content:", data);
      throw new Error("Invalid response structure from OpenAI API.");
    }

    const content = data.choices[0].message.content;

    try {
      // Due to response_format: "json_object", this should be directly parseable
      const parsed: MessageAnalysis = JSON.parse(content);

      // Basic validation for the parsed object structure and default values
      const validatedParsed: MessageAnalysis = {
        mood: typeof parsed.mood === 'string' ? parsed.mood : "neutral",
        tone: typeof parsed.tone === 'string' ? parsed.tone : "neutral",
        intent: typeof parsed.intent === 'string' ? parsed.intent : "unknown",
        emotion_score: typeof parsed.emotion_score === 'number' ? parsed.emotion_score : 0,
        formality_score: typeof parsed.formality_score === 'number' ? parsed.formality_score : 0.5 // Default to 0.5 (neutral)
      };

      // Warn if any expected type is off or missing key was filled with default
      if (
        typeof parsed.mood !== 'string' ||
        typeof parsed.tone !== 'string' ||
        typeof parsed.intent !== 'string' ||
        typeof parsed.emotion_score !== 'number' ||
        typeof parsed.formality_score !== 'number'
      ) {
        console.warn("Parsed JSON from OpenAI has unexpected types or missing keys. Using defaults. Raw:", parsed);
      }

      return validatedParsed;
    } catch (parseError) {
      console.error("❌ Failed to parse JSON from OpenAI response:", parseError, "Raw content:", content);
      return { mood: "neutral", tone: "neutral", intent: "unknown", emotion_score: 0, formality_score: 0.5 };
    }

  } catch (apiError: any) {
    console.error("❌ Error communicating with OpenAI API:", apiError.message);
    return { mood: "neutral", tone: "neutral", intent: "unknown", emotion_score: 0, formality_score: 0.5 };
  }
}