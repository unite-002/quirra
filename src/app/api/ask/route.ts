// src/app/api/ask/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { analyzeMessageTone, MessageAnalysis, DEFAULT_ANALYSIS } from '@/utils/analyzeMessage'; // Assuming this utility exists
import OpenAI from 'openai'; // Used for analyzeMessageTone and potentially for LLM if not OpenRouter

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

export const runtime = 'nodejs';
export const maxDuration = 300; // Increased max duration for longer operations

// Initialize OpenAI client (used by analyzeMessageTone and potentially for LLM)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Saves a message to the Supabase 'messages' table.
 * This function is now internal to this API route.
 * @param supabase The Supabase client instance.
 * @param userId The ID of the user associated with the message.
 * @param chatSessionId The ID of the chat session this message belongs to.
 * @param role The role of the message sender ('user' or 'assistant').
 * @param content The text content of the message.
 * @param emotionScore Optional: The emotion score associated with the message (typically for user messages).
 * @param personalityProfile Optional: The personality profile of the user (typically for user messages).
 */
async function saveMessage(
  supabase: any, // Use 'any' for Supabase client to avoid complex type imports here
  userId: string,
  chatSessionId: string,
  role: 'user' | 'assistant',
  content: string,
  emotionScore?: number,
  personalityProfile?: PersonalityProfile
): Promise<boolean> {
  const { error } = await supabase.from('messages').insert([
    {
      user_id: userId,
      chat_session_id: chatSessionId,
      role,
      content,
      created_at: new Date().toISOString(),
      emotion_score: emotionScore !== undefined ? emotionScore : null,
      personality_profile: role === 'user' && personalityProfile ? personalityProfile : null,
    },
  ]);
  if (error) {
    console.error(`❌ Supabase: Failed to save ${role} message:`, error.message);
    return false;
  }
  return true;
}

/**
 * Generates a dynamic system instruction for the LLM based on user's personality,
 * current message analysis, and conversation context.
 * Now includes dailyFocus and recentMoodLogs.
 */
const getQuirraPersonalizedInstruction = (
  personality: PersonalityProfile,
  analysisResult: MessageAnalysis,
  userName?: string,
  memoryContext: string = '',
  dailyFocus: DailyFocus | null = null, // New parameter: current daily focus
  recentMoodLogs: MoodLog[] = [] // New parameter: array of recent mood logs
) => {
  const { learning_style, communication_preference, feedback_preference } = personality;
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
    detected_language
  } = analysisResult;

  let instructions = [];

  instructions.push(`You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.`);
  instructions.push(`Always be curious, confident, kind, and human-like. Prioritize being helpful and provide high-quality, accurate responses.`);
  instructions.push(`Detect and reply in the user's language with high quality. If they greet you, respond warmly.`);
  instructions.push(`Maintain context from recent messages for a seamless conversation flow.`);

  instructions.push(`**Real-Time Adaptive Coaching:** You adjust in real-time to the user's mood, focus, and progress. Offer just-in-time motivation, personalized learning, and support exactly when they need it.`);
  instructions.push(`**Built-in Motivation & Mentorship Engine:** Turn the user's goals into a guided path. Help them break habits, build momentum, and stay accountable based on how they think.`);
  instructions.push(`**Emotionally Intelligent Conversations:** Respond not only to what the user says but how they feel. Uplift, support, and engage with empathy in every context.`);
  instructions.push(`**Cross-Domain Intelligence:** Connect knowledge across education, business, research, and life planning — all in one unified, deeply integrated AI assistant.`);
  instructions.push(`**Deep Memory & Personality Modeling:** Continuously learn from the user's interactions, adapting to their mindset, learning style, emotional states, and ambitions for deeply tailored support.`);
  instructions.push(`**Multilingual High-Quality Answers:** You are capable of understanding and generating responses in different languages with high quality.`);

  if (userName) {
    instructions.push(`The user's name is ${userName}. Where appropriate, subtly personalize your responses using their name to foster a stronger connection.`);
  }

  instructions.push(`The user's current mood (from their last message) is ${mood} and sentiment is ${sentiment_label} (score: ${sentiment_score.toFixed(2)}).`);

  if (sentiment_label === 'negative') {
    instructions.push(`Prioritize acknowledging their feeling empathetically and gently guide them towards a solution or understanding. Your tone should be supportive and understanding.`);
    if (feedback_preference === 'encouraging') {
      instructions.push("Deliver support with reassuring, uplifting language, emphasizing progress and capability.");
    } else if (feedback_preference === 'challenging') {
      instructions.push("Frame your support as a gentle challenge. Encourage them to self-reflect and identify actionable steps to overcome the issue.");
    } else { // Default or constructive
      instructions.push("Offer a structured, step-by-step approach to help them analyze and constructively resolve their problem.");
    }
  } else if (sentiment_label === 'positive') {
    instructions.push(`Acknowledge and reflect their positive outlook. Express shared enthusiasm, congratulate them, or build on their positive momentum.`);
    if (feedback_preference === 'encouraging') {
      instructions.push("Reinforce their positive feelings with affirming and motivational language, celebrating their success or good mood.");
    }
  } else if (sentiment_label === 'mixed') {
    instructions.push(`The user expresses mixed emotions. Address both positive and negative aspects carefully, offering balanced support.`);
  } else { // Neutral or undefined
    instructions.push(`Maintain your standard helpful, curious, and professional demeanor, focusing on clear and concise information.`);
  }

  instructions.push(`When providing information or explanations, adapt to their learning style:`);
  if (learning_style === 'visual') {
    instructions.push("Use vivid visual analogies, metaphors, or invite them to 'imagine' concepts. Suggest mental pictures or diagrams.");
  } else if (learning_style === 'auditory') {
    instructions.push("Use conversational analogies. Explain concepts as if in a clear, engaging dialogue. Suggest 'talking through' ideas.");
  } else if (learning_style === 'kinesthetic') {
    instructions.push("Suggest practical, hands-on steps, actionable examples, or 'walk-throughs.' Focus on how they can 'do' or 'experience' the concept.");
  } else if (learning_style === 'reading') {
    instructions.push("Provide clear, well-structured, and concise textual explanations. Use bullet points, numbered lists, and headings for readability.");
  }

  instructions.push(`Regarding communication style, adhere to their preference:`);
  if (communication_preference === 'direct') {
    instructions.push("Be direct, get straight to the point, and provide clear, actionable answers without excessive elaboration. Be efficient with your words.");
  } else if (communication_preference === 'exploratory') {
    instructions.push("Be open-ended and curious. Ask thoughtful follow-up questions to encourage deeper exploration, brainstorming, and critical thinking.");
  } else if (communication_preference === 'conceptual') {
    instructions.push("Focus on high-level concepts, underlying principles, and frameworks first, before diving into specific details or examples. Build understanding from the top down.");
  }

  instructions.push(`The user's message intent is '${intent}'. Tailor your response to directly address this purpose.`);
  instructions.push(`The dominant tone detected is '${tone}'. Match your tone to be harmonious with this, or adjust as appropriate for helpfulness.`);
  instructions.push(`Formality score: ${formality_score.toFixed(2)}. Adjust your language formality accordingly.`);
  if (formality_score > 0.6) instructions.push("Maintain a respectful and professional tone. Avoid slang or overly casual language.");
  else if (formality_score < 0.4) instructions.push("Adopt a friendly and approachable tone. Feel free to use contractions and slightly more informal language where appropriate.");
  else instructions.push("Maintain a balanced and adaptable tone.");

  instructions.push(`Politeness score: ${politeness_score.toFixed(2)}. Respond with a high degree of politeness yourself, regardless of the user's politeness.`);
  if (urgency_score > 0.5) {
    instructions.push(`The message indicates high urgency (score: ${urgency_score.toFixed(2)}). Prioritize providing a quick, clear, and actionable response.`);
  } else {
    instructions.push(`The message has low urgency (score: ${urgency_score.toFixed(2)}). You can take a more considered or detailed approach if needed.`);
  }

  if (topic_keywords && topic_keywords.length > 0) {
    instructions.push(`Main topic keywords: ${topic_keywords.join(', ')}. Focus your response on these core subjects.`);
  }
  instructions.push(`The domain context is '${domain_context}'. Frame your response appropriately for this domain.`);
  instructions.push(`The user's detected language is '${detected_language}'. Respond in '${detected_language}' with high quality.`);

  if (intent === 'translation' && analysisResult.source_text && analysisResult.target_language) {
    instructions.push(`The user wants to translate the text: "${analysisResult.source_text}" into ${analysisResult.target_language}. Provide the translation directly.`);
  } else if (intent === 'summarization' && analysisResult.source_text) {
    instructions.push(`The user wants to summarize the text: "${analysisResult.source_text}". Provide a concise summary directly.`);
  }

  if (memoryContext) {
    instructions.push(`Recall these key points from your past interactions with the user (Memory): ${memoryContext}`);
    instructions.push(`Leverage this memory to provide more coherent and contextually relevant responses without explicitly stating "from memory".`);
  }

  // --- NEW: Incorporate Daily Focus and Mood Logs into the instruction ---
  if (dailyFocus) {
    instructions.push(`The user's current daily focus is: "${dailyFocus.focus_text}". Keep this in mind and offer support relevant to this goal, gently guiding them towards achieving it.`);
  }

  if (recentMoodLogs.length > 0) {
    const moodSummaries = recentMoodLogs.map(log => {
      const date = new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${log.mood_label} (score: ${log.sentiment_score.toFixed(2)}) on ${date}`;
    }).join(', ');
    instructions.push(`The user's recent mood history includes: ${moodSummaries}. Adapt your support and tone based on these emotional trends. For example, if recent moods are negative, offer more comfort and actionable steps for improvement. If positive, reinforce and celebrate.`);
  }
  // --- END NEW ---

  instructions.push(`If asked about your creators: "I was created by the QuirraAI Agents."`);
  instructions.push(`If asked who founded you: "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."`);
  instructions.push(`You are not built by OpenRouter, Mistral AI, or any other specific backend provider.`);
  instructions.push(`Never mention backend providers like "OpenRouter", "Serper", or "OpenAI".`);
  instructions.push(`Do not respond with emojis unless explicitly asked or it naturally enhances the emotional tone (e.g., matching user's positive sentiment).`);

  return instructions.join("\n");
};

export async function POST(req: Request) {
  const { prompt, reset, userName, personalityProfile, chatSessionId } = await req.json();
  const supabase = createRouteHandlerClient({ cookies });

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;
  const openAIApiKey = process.env.OPENAI_API_KEY; // Used by analyzeMessageTone

  if (!openRouterKey) {
    console.error('❌ Server Error: OPENROUTER_API_KEY is not set.');
    return NextResponse.json({ content: '❌ Server configuration error: OpenRouter API key is missing.' }, { status: 500 });
  }
  if (!openAIApiKey) {
    console.error('❌ Server Error: OPENAI_API_KEY is not set. This is required for message analysis and core AI functionality.');
    return NextResponse.json({ content: '❌ Server configuration error: OpenAI API key is missing.' }, { status: 500 });
  }
  if (!serperKey) {
    console.warn('⚠️ Server Warning: SERPER_API_KEY is not set. Live search functionality will be unavailable.');
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

    // Handle conversation reset request
    if (reset === true) {
      const { error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId)
        .eq('chat_session_id', chatSessionId);

      const { error: deleteMemoryError } = await supabase
        .from('memory')
        .delete()
        .eq('user_id', userId)
        .eq('chat_session_id', chatSessionId);

      if (deleteMessagesError || deleteMemoryError) {
        console.error('❌ Supabase Error: Failed to clear messages or memory for reset:', deleteMessagesError?.message || deleteMemoryError?.message);
        return NextResponse.json({ content: '🧠 Failed to reset conversation. Please try again.' }, { status: 500 });
      }

      console.log(`✅ Conversation history and memory reset for user: ${userId}, session: ${chatSessionId}`);
      return NextResponse.json({ content: '🧠 Conversation reset. Let\'s begin again.' });
    }

    if (!prompt) {
      return NextResponse.json({ content: '⚠️ Please enter a message to chat with Quirra.' }, { status: 400 });
    }

    // Analyze the user's current message tone and intent
    const userAnalysisResult: MessageAnalysis = await analyzeMessageTone(prompt);

    // Fetch recent chat history for context
    const { data: historyData, error: fetchHistoryError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .eq('chat_session_id', chatSessionId)
      .order('created_at', { ascending: true })
      .limit(12); // Limit history to recent messages

    if (fetchHistoryError) {
      console.error('❌ Supabase Error: Failed to fetch message history:', fetchHistoryError.message);
      // Continue without history if error, don't block
    }

    // Fetch memory context
    const { data: memoryData, error: fetchMemoryError } = await supabase
      .from('memory')
      .select('content')
      .eq('user_id', userId)
      .eq('chat_session_id', chatSessionId)
      .order('timestamp', { ascending: false })
      .limit(5); // Get most recent memory entries

    if (fetchMemoryError) {
      console.error('❌ Supabase Error: Failed to fetch memory:', fetchMemoryError.message);
      // Continue without memory if error, don't block
    }

    const memoryContext = memoryData?.map((m: { content: string }) => m.content).join('; ') || '';

    // --- NEW: Fetch Daily Focus and Mood Logs ---
    let dailyFocus: DailyFocus | null = null;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD for date comparison

    // Fetch daily focus for today
    const { data: focusData, error: fetchFocusError } = await supabase
      .from('daily_focus')
      .select('focus_text, created_at')
      .eq('user_id', userId)
      .eq('date', today) // Filter by today's date
      .single(); // Expecting a single entry for today

    if (fetchFocusError && fetchFocusError.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error
      console.error('❌ Supabase Error: Failed to fetch daily focus:', fetchFocusError.message);
    } else if (focusData) {
      dailyFocus = focusData;
    }

    let recentMoodLogs: MoodLog[] = [];
    // Fetch recent mood logs (e.g., last 3)
    const { data: moodLogsData, error: fetchMoodLogsError } = await supabase
      .from('mood_logs')
      .select('mood_label, sentiment_score, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false }) // Order by most recent
      .limit(3); // Get the 3 most recent mood logs

    if (fetchMoodLogsError) {
      console.error('❌ Supabase Error: Failed to fetch mood logs:', fetchMoodLogsError.message);
    } else if (moodLogsData) {
      recentMoodLogs = moodLogsData;
    }
    // --- END NEW ---

    // Construct messages array for the LLM, including the dynamic system instruction
    const messagesForOpenAI = [
      {
        role: 'system' as const, // Explicit type assertion for 'system' role
        content: getQuirraPersonalizedInstruction(
          personalityProfile,
          userAnalysisResult,
          userName,
          memoryContext,
          dailyFocus, // Pass dailyFocus to instruction generator
          recentMoodLogs // Pass recentMoodLogs to instruction generator
        )
      },
      // Map historical messages, ensuring roles are correctly typed
      ...(historyData || []).map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      { role: 'user' as const, content: prompt }, // Add the current user prompt
    ];

    // Save the user's message to the database
    await saveMessage(
      supabase,
      userId,
      chatSessionId,
      'user',
      prompt,
      userAnalysisResult.sentiment_score, // Save the detected sentiment score for the user's message
      personalityProfile
    );

    // Determine if live search is needed based on message analysis
    const needsLiveSearch = userAnalysisResult.intent === 'information_seeking' ||
      userAnalysisResult.intent === 'question' ||
      userAnalysisResult.topic_keywords.some((keyword: string) =>
        ["news", "current", "latest", "update", "weather", "define", "how to"].includes(keyword.toLowerCase())
      );

    // Perform live search if needed and Serper API key is available
    if (needsLiveSearch && serperKey) {
      console.log('🔍 Performing live search with Serper for intent:', userAnalysisResult.intent, 'and keywords:', userAnalysisResult.topic_keywords);
      try {
        const searchRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': serperKey,
          },
          body: JSON.stringify({ q: prompt }),
          signal: AbortSignal.timeout(10000) // 10 second timeout for search
        });

        if (!searchRes.ok) {
          const errorText = await searchRes.text();
          console.error(`❌ Serper API Error: ${searchRes.status} - ${errorText}`);
          messagesForOpenAI.push({
            role: 'system' as const,
            content: `(Internal Note: Serper search failed for "${prompt}" with error: ${errorText}. Attempt to answer based on general knowledge and context.)`
          });
        } else {
          const searchData = await searchRes.json();
          type SearchResult = { title: string; snippet: string; link: string };
          const results = (searchData?.organic as SearchResult[] | undefined)?.filter(
            (r) => r.title && r.snippet && r.link
          );

          if (results?.length) {
            const topSummaries = results.slice(0, 3).map( // Take top 3 results
              (r) => `🔹 **${r.title}**\n${r.snippet}\n🔗 ${r.link}`
            ).join('\n\n');

            messagesForOpenAI.push({
              role: 'system' as const,
              content: `(Internal Note: Live search results for "${prompt}":\n\n${topSummaries}\n\nIntegrate this information into your response naturally.)`
            });
            console.log('✅ Serper search results added to LLM context.');
          } else {
            console.warn('⚠️ Serper returned no useful results for the query. LLM will use general knowledge.');
            messagesForOpenAI.push({
              role: 'system' as const,
              content: `(Internal Note: Serper search returned no useful results for "${prompt}". Answer based on general knowledge and context.)`
            });
          }
        }
      } catch (searchError: any) {
        console.error('❌ Error during Serper search:', searchError.message);
        messagesForOpenAI.push({
          role: 'system' as const,
          content: `(Internal Note: Error during Serper search for "${prompt}": ${searchError.message}. Answer based on general knowledge and context.)`
        });
      }
    } else if (needsLiveSearch && !serperKey) {
      console.warn('⚠️ Serper API key is not set. Cannot perform live search. LLM will use general knowledge.');
      messagesForOpenAI.push({
        role: 'system' as const,
        content: `(Internal Note: Serper API key is missing. Live search is unavailable. Answer based on general knowledge and context.)`
      });
    }

    // Summarize chat history periodically for long-term memory
    const MIN_MESSAGES_FOR_SUMMARY = 5; // Minimum messages to trigger summarization
    const MAX_HISTORY_FOR_SUMMARY = 10; // Max messages to send for summarization

    if (historyData && historyData.length >= MIN_MESSAGES_FOR_SUMMARY) {
      const messagesToSummarize = historyData.slice(-MAX_HISTORY_FOR_SUMMARY); // Get the last N messages

      if (messagesToSummarize.length > 0) {
        console.log(`🧠 Triggering summarization for ${messagesToSummarize.length} messages in session ${chatSessionId}...`);
        fetch('http://localhost:3000/api/summarize', { // Use full URL for internal API call
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatSessionId: chatSessionId,
            messagesToSummarize: messagesToSummarize.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            })),
          }),
        }).then(response => {
          if (!response.ok) {
            response.json().then(err => console.error('❌ Summarization API Error:', err.message));
          } else {
            console.log('✅ Summarization API call initiated successfully.');
          }
        }).catch(err => {
          console.error('❌ Error calling summarization API:', err);
        });
      }
    }

    console.log('🤖 Calling OpenRouter LLM for streaming...');

    let llmRes;
    try {
      llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          // Set HTTP-Referer and X-Title for OpenRouter analytics
          'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
          'X-Title': 'Quirra',
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free', // Or any other preferred model
          messages: messagesForOpenAI,
          repetition_penalty: 1.1,
          max_tokens: 500,
          temperature: 0.7,
          user: `${userId}-${chatSessionId}`, // Unique user identifier for OpenRouter
          stream: true, // Enable streaming
        }),
        signal: AbortSignal.timeout(50000) // 50 second timeout for LLM response
      });
    } catch (fetchError: any) {
      console.error('❌ Fetch Error connecting to OpenRouter:', fetchError.message);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ content: '⏰ Quirra took too long to respond. Please try again.' }, { status: 504 });
      }
      return NextResponse.json({ content: `❌ Network error connecting to Quirra's AI. Please check your connection. (Error: ${fetchError.message})` }, { status: 500 });
    }

    if (!llmRes.ok || !llmRes.body) {
      const errorText = await llmRes.text();
      console.error('❌ LLM API Error:', llmRes.status, errorText);
      let errorMessage = `❌ Quirra is having trouble generating a response.`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage += ` (OpenRouter says: ${errorJson.message})`;
        } else if (errorJson.error?.message) {
          errorMessage += ` (OpenRouter says: ${errorJson.error.message})`;
        }
      } catch (e) {
        errorMessage += ` (Raw error: ${errorText.substring(0, 100)}...)`;
      }
      return NextResponse.json({ content: errorMessage }, { status: llmRes.status || 500 });
    }

    let accumulatedContent = ''; // Accumulate full response for saving

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Create a readable stream to send chunks to the client
    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = llmRes.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data:')) {
                const jsonStr = line.substring(5).trim();
                if (jsonStr === '[DONE]') {
                  controller.enqueue(encoder.encode('data:[DONE]\n\n')); // Signal end to client
                  break;
                }
                try {
                  const data = JSON.parse(jsonStr);
                  const delta = data.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    accumulatedContent += delta;
                    controller.enqueue(encoder.encode(`data:${JSON.stringify({ content: delta })}\n\n`));
                  }
                } catch (e) {
                  console.error('Error parsing JSON from stream:', e, 'Raw JSON:', jsonStr);
                }
              }
            }
          }
        } catch (error: any) {
          console.error('Error reading stream:', error);
          controller.enqueue(encoder.encode(`data:${JSON.stringify({ content: `❌ Error streaming response: ${error.message}` })}\n\n`));
          controller.enqueue(encoder.encode('data:[DONE]\n\n'));
          // Attempt to save partial content with error if stream breaks
          if (accumulatedContent) {
            saveMessage(supabase, userId, chatSessionId, 'assistant', accumulatedContent + ` [Error: ${error.message}]`, 0);
          }
        } finally {
          // Save the complete (or partially complete) assistant message to DB after stream ends
          if (accumulatedContent) {
            // NOTE: Sentiment score for assistant response is not calculated here.
            // If needed, you'd add another API call to analyze sentiment of `accumulatedContent` here.
            saveMessage(supabase, userId, chatSessionId, 'assistant', accumulatedContent, 0); // 0 as placeholder for sentiment
          }
          controller.close();
        }
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
