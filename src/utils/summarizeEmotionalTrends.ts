// src/utils/summarizeEmotionalTrends.ts

// IMPORTANT: This file should NOT import 'openai'. All LLM calls go through OpenRouter.

// Define interfaces for Mood Log entries
interface MoodLog {
  mood_label: string;
  sentiment_score: number;
  timestamp: string;
}

/**
 * Summarizes emotional trends from recent mood logs and messages using OpenRouter.
 * Saves the summary to Supabase 'memory' table under the 'content' column with 'key'='emotional_trend_summary'.
 * @param supabase The Supabase client instance.
 * @param userId The ID of the user.
 * @param chatSessionId Optional: The current chat session ID. If provided, the memory will be linked to it.
 * @returns A Promise that resolves to the generated summary string, or null if an error occurs.
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
        const snippet = msg.content.length > 100 ? `${msg.content.substring(0, 100)}...` : msg.content;
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

  // 3. Use OpenRouter to summarize the emotional trends
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`,
        "HTTP-Referer": "YOUR_SITE_URL_HERE", // Replace with your actual site URL
        "X-Title": "Quirra AI Prototype - Summarization", // Replace with your app title
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v3-0324:free", // Using a capable free model for summarization
        messages: [
          {
            role: "system",
            content: `You are an expert in human psychology and emotional intelligence. Your task is to analyze the provided emotional data (mood logs and message emotional context) for a user over the past week.
            Identify key emotional trends, recurring emotional states, significant shifts in mood or intensity, and any potential underlying reasons based on the message snippets.
            Synthesize this into a concise, empathetic, and actionable summary (1-3 sentences) that Quirra (an AI assistant) can use to better understand and support the user's long-term emotional well-being.
            The summary should be phrased as an internal note for Quirra, focusing on insights about the user's emotional state AND *how Quirra should adapt its behavior*.

            Examples of desired output format:
            - "User has shown consistent high levels of curiosity and engagement this week, particularly around learning new concepts. Quirra should continue to foster this curiosity by providing detailed explanations and encouraging exploration."
            - "User has expressed increasing anxiety over the past few days, especially concerning work-life balance. Their mood logs show a consistent 'frustration' dominant emotion. Quirra should offer more empathetic support and gentle guidance on stress management techniques."
            - "User's emotional state has been relatively stable this week, with varied but generally mild sentiments. Quirra should maintain its current supportive and curious demeanor."
            - "There was a brief dip in mood on Tuesday related to a project deadline, but they recovered quickly. Overall, the user seems driven and positive; Quirra should reinforce their positive momentum."

            If no strong trends are apparent, state that the user's emotional state has been relatively stable or varied, and suggest a default supportive approach.
            `
          },
          {
            role: "user",
            content: `Here is the user's recent emotional data:\n\n${fullEmotionalContext}\n\nPlease provide a concise summary of their emotional trends, including actionable advice for Quirra.`
          }
        ],
        temperature: 0.5,
        max_tokens: 150, // Keep summary concise
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouter Summarization API HTTP error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (summary) {
      console.log(`✅ Emotional trend summary generated: ${summary}`);
      // 4. Save the summary to the 'memory' table
      // Use upsert to update if a summary with this key already exists for the user
      const { error: memorySaveError } = await supabase.from('memory').upsert(
        {
          user_id: userId,
          key: 'emotional_trend_summary', // A specific key for this type of memory
          content: summary, // Storing summary in the 'content' column as per route.ts
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
      return summary;
    } else {
      console.warn("⚠️ OpenRouter did not return a summary for emotional trends.");
      return null;
    }

  } catch (apiError: any) {
    console.error("❌ Error generating emotional trend summary with OpenRouter:", apiError.message);
    return null;
  }
}