// src/utils/summarizeEmotionalTrends.ts

// IMPORTANT: This file should NOT import 'openai'. All LLM calls go through OpenRouter.

// Define interfaces for Mood Log entries
interface MoodLog {
  mood_label: string;
  sentiment_score: number;
  timestamp: string;
}

interface OpenRouterChoice {
  message?: { role?: string; content?: string };
}

/**
 * Summarizes emotional trends from recent mood logs and messages using OpenRouter.
 * Saves the summary to Supabase 'memory' table under the 'content' column with 'key'='emotional_trend_summary'.
 * This implementation uses Meta Llama 4 Maverick (free) as the primary model and falls back to alternatives
 * if the primary model is unavailable. It includes robust retry/backoff, improved system prompt,
 * and structured output (summary + prioritized actions + confidence score + tags) so Quirra can adapt behavior.
 *
 * NOTE: We intentionally avoid asking for or logging private content beyond short message snippets.
 */
export async function summarizeEmotionalTrends(
  supabase: any, // Use 'any' for SupabaseClient
  userId: string,
  chatSessionId: string | null = null // Allow linking to a specific session
): Promise<string | null> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey) {
    console.error("❌ OPENROUTER_API_KEY is not set. Cannot summarize emotional trends.");
    return null;
  }

  console.log(`🧠 Starting emotional trend summarization for user: ${userId}`);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  let emotionalDataForLLM: string[] = [];

  // 1. Fetch recent mood logs (e.g., last 7 days)
  const { data: moodLogs, error: moodLogsError } = await supabase
    .from('mood_logs') // Ensure table name is 'mood_logs'
    .select('mood_label, sentiment_score, timestamp')
    .eq('user_id', userId)
    .gte('timestamp', sevenDaysAgoISO)
    .order('timestamp', { ascending: true });

  if (moodLogsError) {
    console.error('❌ Supabase Error: Failed to fetch mood logs for summarization:', moodLogsError.message);
  } else if (moodLogs && moodLogs.length > 0) {
    emotionalDataForLLM.push("--- Recent Mood Log History (Past 7 Days) ---");
    moodLogs.forEach((log: MoodLog) => {
      const date = new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      emotionalDataForLLM.push(`On ${date}: Mood: ${log.mood_label}, Intensity: ${log.sentiment_score.toFixed(2)}`);
    });
  }

  // 2. Fetch recent user messages with detailed emotion data (e.g., last 20 user messages)
  const { data: messages, error: messagesError } = await supabase
    .from('messages') // Ensure table name is 'messages'
    .select('role, content, created_at, dominant_emotion, overall_emotional_intensity')
    .eq('user_id', userId)
    .eq('role', 'user') // Only consider user messages for emotional analysis
    .gte('created_at', sevenDaysAgoISO)
    .order('created_at', { ascending: true })
    .limit(20); // Limit to a reasonable number of recent messages

  if (messagesError) {
    console.error('❌ Supabase Error: Failed to fetch messages for emotional summarization:', messagesError.message);
  } else if (messages && messages.length > 0) {
    emotionalDataForLLM.push("\n--- Recent User Message Emotional Context (Past 7 Days) ---");
    messages.forEach((msg: any) => { // Use any here to match fetched data structure
      if (msg.dominant_emotion && typeof msg.overall_emotional_intensity === 'number') {
        const date = new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const time = new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        // Include a slightly longer snippet to provide more context for the emotion
        const snippet = msg.content.length > 200 ? `${msg.content.substring(0, 200)}...` : msg.content;
        emotionalDataForLLM.push(`On ${date} at ${time}: Dominant Emotion: ${msg.dominant_emotion}, Intensity: ${msg.overall_emotional_intensity.toFixed(2)}. Message: "${snippet}"`);
      }
    });
  }

  if (emotionalDataForLLM.length === 0) {
    console.log("No recent emotional data found for summarization.");
    // For a "top chatbot", even with no data, we can provide a default positive/stable summary
    const defaultSummary = "User's recent emotional state appears stable and generally positive, indicating a good baseline for continued supportive interaction.";
    // Save this default summary to memory
    const { error: memorySaveError } = await supabase.from('memory').upsert(
      {
        user_id: userId,
        key: 'emotional_trend_summary',
        content: defaultSummary,
        timestamp: new Date().toISOString(),
        chat_session_id: chatSessionId,
      },
      { onConflict: 'user_id, key' }
    );
    if (memorySaveError) {
      console.error('❌ Supabase Error: Failed to save default emotional trend summary:', memorySaveError.message);
    } else {
      console.log('✅ Default emotional trend summary saved to memory.');
    }
    return defaultSummary;
  }

  const fullEmotionalContext = emotionalDataForLLM.join('\n');

  // 3. Prepare OpenRouter call with primary and fallback models
  const MODEL_PRIORITY = [
    'meta-llama/llama-4-maverick:free', // Primary — strong multimodal, 1M context
    'alibaba/qwen3-235b-a22b:free',     // Fallback — strong reasoning + multilingual
    'openai/gpt-oss-120b:free'          // Last resort — open-source strong reasoning model
  ];

  const systemPrompt = `You are an expert in human psychology, emotional intelligence, and supportive conversational design.\n
Your job: Analyze the provided emotional data (mood logs + user message emotional context) and produce a concise, highly actionable internal summary that Quirra (an assistant) can use immediately.\n
Requirements:\n- Output a short structured summary composed of: 1) TL;DR (1 sentence), 2) Key trends (1-3 bullets), 3) Top 3 prioritized actions Quirra should take (bulleted, short), 4) Confidence score (0-100), 5) Tags (comma-separated), and 6) One-line adaptive response example Quirra could send to the user.\n- Be empathetic, concise, non-judgmental, and practical.\n- If the data suggests potential risk (self-harm, severe depression, suicidal ideation), flag with the tag SAFETY-RISK and set Confidence >= 70. Do NOT provide clinical diagnosis; give emergency guidance only when necessary (e.g., encourage seeking immediate help).\n- Keep the full output under ~200 tokens; prioritize clarity and actionability.\n`;

  const userPrompt = `Here is the user's recent emotional data:\n\n${fullEmotionalContext}\n\nProduce the structured summary using the format described.`;

  // Helper: exponential backoff retry
  async function callOpenRouterWithRetries(model: string, retries = 3): Promise<string | null> {
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    let attempt = 0;
    let lastErr: any = null;

    while (attempt < retries) {
      try {
        attempt++;
        const controller = new AbortController();
        const timeoutMs = 20000; // 20s
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterApiKey}`,
            'X-Title': 'Quirra AI Prototype - Summarization',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.25, // lower for more reliable summaries
            max_tokens: 200,
            // keep deterministic and concise
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (res.status === 429) {
          // Rate limited — backoff and retry
          const delay = 500 * Math.pow(2, attempt); // 500ms, 1000ms, 2000ms
          console.warn(`⚠️ OpenRouter rate limited (429). Backing off ${delay}ms before retry #${attempt}`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (!res.ok) {
          const text = await res.text();
          lastErr = new Error(`HTTP ${res.status}: ${text}`);
          console.error('❌ OpenRouter HTTP error:', res.status, text);
          // try next retry or fallback
          await new Promise(r => setTimeout(r, 300 * attempt));
          continue;
        }

        const json = await res.json();
        const choice: OpenRouterChoice | undefined = json.choices?.[0];
        const content = choice?.message?.content?.trim() ?? null;
        if (!content) {
          lastErr = new Error('No content in OpenRouter response');
          console.warn('⚠️ OpenRouter returned no content; retrying...');
          await new Promise(r => setTimeout(r, 200 * attempt));
          continue;
        }
        return content;

      } catch (err: any) {
        lastErr = err;
        if (err.name === 'AbortError') {
          console.warn('⚠️ OpenRouter request aborted due to timeout.');
        } else {
          console.error('❌ OpenRouter request error:', err?.message ?? err);
        }
        const delay = 400 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    console.error('❌ All OpenRouter attempts failed for model', model, lastErr?.message ?? lastErr);
    return null;
  }

  // Try models in order
  let finalSummary: string | null = null;
  for (const modelId of MODEL_PRIORITY) {
    console.log(`🔁 Attempting summarization with model: ${modelId}`);
    try {
      const result = await callOpenRouterWithRetries(modelId, 3);
      if (result) {
        finalSummary = result;
        console.log(`✅ Summary generated using ${modelId}`);
        break;
      }
    } catch (err) {
      console.error(`❌ Error while using model ${modelId}:`, (err as any)?.message ?? err);
      // try next model
    }
  }

  if (!finalSummary) {
    console.warn('⚠️ Failed to generate emotional summary with all models.');
    return null;
  }

  // 4. Save the summary to the 'memory' table
  try {
    const { error: memorySaveError } = await supabase.from('memory').upsert(
      {
        user_id: userId,
        key: 'emotional_trend_summary', // A specific key for this type of memory
        content: finalSummary, // Storing summary in the 'content' column as per route.ts
        timestamp: new Date().toISOString(),
        chat_session_id: chatSessionId, // Link to current session if available
      },
      { onConflict: 'user_id, key' } // Conflict on user_id and key to update existing entry
    );

    if (memorySaveError) {
      console.error('❌ Supabase Error: Failed to save emotional trend summary to memory:', memorySaveError.message);
      return null;
    }
    console.log('✅ Emotional trend summary saved to memory.');
    return finalSummary;
  } catch (saveErr: any) {
    console.error('❌ Unexpected error while saving summary to Supabase:', saveErr?.message ?? saveErr);
    return null;
  }
}
