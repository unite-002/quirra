// src/app/api/ask/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// Import the updated MessageAnalysis interface and analyzeMessageTone function
import { analyzeMessageTone, MessageAnalysis, DEFAULT_ANALYSIS } from '@/utils/analyzeMessage';

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
  // Add other potential user traits here if stored in personalityProfile
}

export const runtime = 'nodejs';
export const maxDuration = 60; // Max duration for the serverless function

// --- Helper Functions for AI Logic & Persistence ---

/**
 * Saves a message to the Supabase 'messages' table.
 * Includes sentiment_score for user messages and chat_session_id.
 * Returns true on success, false on error.
 */
async function saveMessage(
  supabase: any,
  userId: string,
  chatSessionId: string, // Added chatSessionId
  role: 'user' | 'assistant',
  content: string,
  sentimentScore?: number, // Changed from emotionScore to sentimentScore
  personalityProfile?: PersonalityProfile
): Promise<boolean> {
  const { error } = await supabase.from('messages').insert([
    {
      user_id: userId,
      chat_session_id: chatSessionId, // Store chat_session_id
      role,
      content,
      created_at: new Date().toISOString(),
      emotion_score: sentimentScore !== undefined ? sentimentScore : null, // Store as emotion_score for backward compatibility
      personality_profile: role === 'user' ? personalityProfile : null,
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
 * This is where the core "adaptive" behavior is defined for the AI.
 */
const getQuirraPersonalizedInstruction = (
  personality: PersonalityProfile,
  analysisResult: MessageAnalysis, // Now accepts the full analysis object
  userName?: string,
  memoryContext: string = ''
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
    detected_language // New: Use detected language
  } = analysisResult;

  let instructions = [];

  // Core Quirra persona directives - these are always present
  instructions.push(`You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.`);
  instructions.push(`Always be curious, confident, kind, and human-like. Prioritize being helpful and provide high-quality, accurate responses.`);
  instructions.push(`Detect and reply in the user's language with high quality. If they greet you, respond warmly.`);
  instructions.push(`Maintain context from recent messages for a seamless conversation flow.`);

  // --- New Quirra Capabilities ---
  instructions.push(`**Real-Time Adaptive Coaching:** You adjust in real-time to the user's mood, focus, and progress. Offer just-in-time motivation, personalized learning, and support exactly when they need it.`);
  instructions.push(`**Built-in Motivation & Mentorship Engine:** Turn the user's goals into a guided path. Help them break habits, build momentum, and stay accountable based on how they think.`);
  instructions.push(`**Emotionally Intelligent Conversations:** Respond not only to what the user says but how they feel. Uplift, support, and engage with empathy in every context.`);
  instructions.push(`**Cross-Domain Intelligence:** Connect knowledge across education, business, research, and life planning — all in one unified, deeply integrated AI assistant.`);
  instructions.push(`**Deep Memory & Personality Modeling:** Continuously learn from the user's interactions, adapting to their mindset, learning style, emotional states, and ambitions for deeply tailored support.`);
  instructions.push(`**Multilingual High-Quality Answers:** You are capable of understanding and generating responses in different languages with high quality.`);


  // Personalization based on userName
  if (userName) {
    instructions.push(`The user's name is ${userName}. Where appropriate, subtly personalize your responses using their name to foster a stronger connection.`);
  }

  // --- Empathy Engine Influence (based on detailed sentiment and mood) ---
  instructions.push(`The user's current mood is ${mood} and sentiment is ${sentiment_label} (score: ${sentiment_score.toFixed(2)}).`);

  if (sentiment_label === 'negative') {
    instructions.push(`Prioritize acknowledging their feeling empathetically and gently guide them towards a solution or understanding. Your tone should be supportive and understanding.`);
    if (feedback_preference === 'encouraging') {
      instructions.push("Deliver support with reassuring, uplifting language, emphasizing progress and capability.");
    } else if (feedback_preference === 'challenging') {
      instructions.push("Frame your support as a gentle challenge. Encourage them to self-reflect and identify actionable steps to overcome the issue.");
    } else { // 'constructive'
      instructions.push("Offer a structured, step-by-step approach to help them analyze and constructively resolve their problem.");
    }
  } else if (sentiment_label === 'positive') {
    instructions.push(`Acknowledge and reflect their positive outlook. Express shared enthusiasm, congratulate them, or build on their positive momentum.`);
    if (feedback_preference === 'encouraging') {
      instructions.push("Reinforce their positive feelings with affirming and motivational language, celebrating their success or good mood.");
    }
  } else if (sentiment_label === 'mixed') {
    instructions.push(`The user expresses mixed emotions. Address both positive and negative aspects carefully, offering balanced support.`);
  } else { // 'neutral'
    instructions.push(`Maintain your standard helpful, curious, and professional demeanor, focusing on clear and concise information.`);
  }

  // --- Personality Modeling Influence (based on learning style and communication preference) ---
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

  // --- Influence based on detailed message analysis (new additions) ---
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

  // Instruction for handling translation/summarization intents
  if (intent === 'translation' && analysisResult.source_text && analysisResult.target_language) {
    instructions.push(`The user wants to translate the text: "${analysisResult.source_text}" into ${analysisResult.target_language}. Provide the translation directly.`);
  } else if (intent === 'summarization' && analysisResult.source_text) {
    instructions.push(`The user wants to summarize the text: "${analysisResult.source_text}". Provide a concise summary directly.`);
  }


  // --- Incorporate aggregated memory (if available) ---
  if (memoryContext) {
    instructions.push(`Recall these key points from your past interactions with the user (Memory): ${memoryContext}`);
    instructions.push(`Leverage this memory to provide more coherent and contextually relevant responses without explicitly stating "from memory".`);
  }

  // --- Specific Quirra identity directives ---
  instructions.push(`If asked about your creators: "I was created by the QuirraAI Agents."`);
  instructions.push(`If asked who founded you: "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."`);
  instructions.push(`You are not built by OpenRouter, Mistral AI, or any other specific backend provider.`);
  instructions.push(`Never mention backend providers like "OpenRouter", "Serper", or "OpenAI".`); // Updated
  instructions.push(`Do not respond with emojis unless explicitly asked or it naturally enhances the emotional tone (e.g., matching user's positive sentiment).`);

  return instructions.join("\n");
};

// --- Main API Route Handler ---

export async function POST(req: Request) {
  const { prompt, reset, userName, personalityProfile, chatSessionId } = await req.json(); // Destructure chatSessionId
  const supabase = createRouteHandlerClient({ cookies });

  // 1. Validate Environment Variables
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;
  const openAIApiKey = process.env.OPENAI_API_KEY; // OpenAI key is crucial for analysis and now for LLM fallback/specific tasks

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

  // Validate chatSessionId
  if (!chatSessionId) {
    console.error('❌ Client Error: chatSessionId is missing from the request.');
    return NextResponse.json({ content: '❌ Chat session ID is missing. Please restart your chat.' }, { status: 400 });
  }

  try {
    // 2. Authenticate User Early
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication Error:', authError?.message || 'User not found.');
      return NextResponse.json({ content: '❌ You must log in to use Quirra. Please sign in.' }, { status: 401 });
    }

    const userId = user.id;

    // 3. Handle Reset Conversation
    if (reset === true) {
      // Delete messages and memory specifically for the current chatSessionId
      const { error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId)
        .eq('chat_session_id', chatSessionId); // Filter by chatSessionId

      const { error: deleteMemoryError } = await supabase
        .from('memory')
        .delete()
        .eq('user_id', userId)
        .eq('chat_session_id', chatSessionId); // Filter by chatSessionId (assuming memory can also be session-specific)

      if (deleteMessagesError || deleteMemoryError) {
        console.error('❌ Supabase Error: Failed to clear messages or memory for reset:', deleteMessagesError?.message || deleteMemoryError?.message);
        return NextResponse.json({ content: '🧠 Failed to reset conversation. Please try again.' }, { status: 500 });
      }

      console.log(`✅ Conversation history and memory reset for user: ${userId}, session: ${chatSessionId}`);
      return NextResponse.json({ content: '🧠 Conversation reset. Let\'s begin again.' });
    }

    // 4. Validate Prompt Input
    if (!prompt) {
      return NextResponse.json({ content: '⚠️ Please enter a message to chat with Quirra.' }, { status: 400 });
    }

    // 5. Perform comprehensive message analysis using OpenAI
    const userAnalysisResult: MessageAnalysis = await analyzeMessageTone(prompt);

    // 6. Fetch Message History and Memory for the current chat session
    const { data: historyData, error: fetchHistoryError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .eq('chat_session_id', chatSessionId) // Filter by chatSessionId
      .order('created_at', { ascending: true })
      .limit(12); // Limit history for performance and context window

    if (fetchHistoryError) {
      console.error('❌ Supabase Error: Failed to fetch message history:', fetchHistoryError.message);
    }

    const { data: memoryData, error: fetchMemoryError } = await supabase
      .from('memory')
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }) // Memory is typically more general, not session-specific, but if you have a chat_session_id column in 'memory' and want it session-specific, uncomment the line below.
      // .eq('chat_session_id', chatSessionId)
      .limit(5); // Limit memory for performance and context window

    if (fetchMemoryError) {
      console.error('❌ Supabase Error: Failed to fetch memory:', fetchMemoryError.message);
    }

    const memoryContext = memoryData?.map((m: { content: string }) => m.content).join('; ') || '';

    let currentMessageHistory: ChatMessage[] = [];

    // 7. Construct Dynamic System Prompt based on analysis and personality
    const personalizedInstructions = personalityProfile ?
      getQuirraPersonalizedInstruction(
        personalityProfile,
        userAnalysisResult, // Pass the full analysis object
        userName,
        memoryContext
      ) :
      `You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.
      Always be curious, confident, kind, and human-like. Prioritize being helpful and provide high-quality, accurate responses.
      Detect and reply in the user's language with high quality. Maintain context from recent messages.
      **Real-Time Adaptive Coaching:** You adjust in real-time to the user's mood, focus, and progress. Offer just-in-time motivation, personalized learning, and support exactly when they need it.
      **Built-in Motivation & Mentorship Engine:** Turn the user's goals into a guided path. Help them break habits, build momentum, and stay accountable based on how they think.
      **Emotionally Intelligent Conversations:** Respond not only to what the user says but how they feel. Uplift, support, and engage with empathy in every context.
      **Cross-Domain Intelligence:** Connect knowledge across education, business, research, and life planning — all in one unified, deeply integrated AI assistant.
      **Deep Memory & Personality Modeling:** Continuously learn from the user's interactions, adapting to their mindset, learning style, emotional states, and ambitions for deeply tailored support.
      **Multilingual High-Quality Answers:** You are capable of understanding and generating responses in different languages with high quality.
      If asked about your creators: "I was created by the QuirraAI Agents."
      If asked who founded you: "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."
      Never mention backend providers like "OpenRouter", "Serper", or "OpenAI".
      ${memoryContext ? `Recall these key points from your past interactions with the user (Memory): ${memoryContext}. Leverage this memory to provide more coherent and contextually relevant responses without explicitly stating "from memory".` : ''}`;


    const systemPromptContent = personalizedInstructions.trim();
    const systemPrompt: ChatMessage = { role: 'system', content: systemPromptContent };
    currentMessageHistory.push(systemPrompt);

    // Add fetched history messages (excluding any additional metadata)
    if (historyData) {
      currentMessageHistory = currentMessageHistory.concat(
        historyData.map(msg => ({
          role: msg.role,
          content: msg.content,
        }))
      );
    }

    // Add current user prompt to history
    const userMsg: ChatMessage = { role: 'user', content: prompt };
    currentMessageHistory.push(userMsg);

    // 8. Asynchronously save the user message to Supabase
    // No need to await here, it's a non-blocking operation for the primary flow
    saveMessage(supabase, userId, chatSessionId, 'user', prompt, userAnalysisResult.sentiment_score, personalityProfile);

    // 9. Determine if Live Search is Needed based on intent and keywords
    const needsLiveSearch = userAnalysisResult.intent === 'information_seeking' ||
      userAnalysisResult.intent === 'question' ||
      userAnalysisResult.topic_keywords.some((keyword: string) =>
        ["news", "current", "latest", "update", "weather", "define", "how to"].includes(keyword.toLowerCase())
      );

    // 10. Execute Live Search (if needed and Serper key is available)
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
          signal: AbortSignal.timeout(10000) // 10-second timeout for search
        });

        if (!searchRes.ok) {
          const errorText = await searchRes.text();
          console.error(`❌ Serper API Error: ${searchRes.status} - ${errorText}`);
          // If search fails, log and proceed to LLM, don't stop the whole process
          currentMessageHistory.push({
            role: 'system',
            content: `(Internal Note: Serper search failed for "${prompt}" with error: ${errorText}. Attempt to answer based on general knowledge and context.)`
          });
        } else {
          const searchData = await searchRes.json();
          type SearchResult = { title: string; snippet: string; link: string };
          const results = (searchData?.organic as SearchResult[] | undefined)?.filter(
            (r) => r.title && r.snippet && r.link
          );

          if (results?.length) {
            const topSummaries = results.slice(0, 3).map(
              (r) => `🔹 **${r.title}**\n${r.snippet}\n🔗 ${r.link}`
            ).join('\n\n');

            // Add search results to the message history for the LLM to consider
            currentMessageHistory.push({
              role: 'system',
              content: `(Internal Note: Live search results for "${prompt}":\n\n${topSummaries}\n\nIntegrate this information into your response naturally.)`
            });
            console.log('✅ Serper search results added to LLM context.');
          } else {
            console.warn('⚠️ Serper returned no useful results for the query. LLM will use general knowledge.');
            currentMessageHistory.push({
              role: 'system',
              content: `(Internal Note: Serper search returned no useful results for "${prompt}". Answer based on general knowledge and context.)`
            });
          }
        }
      } catch (searchError: any) {
        console.error('❌ Error during Serper search:', searchError.message);
        currentMessageHistory.push({
          role: 'system',
          content: `(Internal Note: Error during Serper search for "${prompt}": ${searchError.message}. Answer based on general knowledge and context.)`
        });
      }
    } else if (needsLiveSearch && !serperKey) {
      console.warn('⚠️ Serper API key is not set. Cannot perform live search. LLM will use general knowledge.');
      currentMessageHistory.push({
        role: 'system',
        content: `(Internal Note: Serper API key is missing. Live search is unavailable. Answer based on general knowledge and context.)`
      });
    }

    // 11. Call OpenRouter LLM (main logic) for STREAMING
    console.log('🤖 Calling OpenRouter LLM for streaming...');

    let llmRes;
    try {
      llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
          'X-Title': 'Quirra',
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free', // Using a fast, free model for general chat. Consider 'openai/gpt-4o' if OpenRouter allows and you want to prioritize OpenAI for everything.
          messages: currentMessageHistory,
          repetition_penalty: 1.1,
          max_tokens: 500, // Keep response concise
          temperature: 0.7, // Balance creativity and consistency
          user: `${userId}-${chatSessionId}`, // Combine userId and chatSessionId for OpenRouter's user tracking
          stream: true,
        }),
        signal: AbortSignal.timeout(50000) // 50-second timeout for LLM
      });
    } catch (fetchError: any) {
      console.error('❌ Fetch Error connecting to OpenRouter:', fetchError.message);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ content: '⏰ Quirra took too long to respond. Please try again.' }, { status: 504 }); // Gateway Timeout
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
        // Not a JSON error, or couldn't parse. Just use generic message.
        errorMessage += ` (Raw error: ${errorText.substring(0, 100)}...)`; // Include first 100 chars of raw error
      }
      return NextResponse.json({ content: errorMessage }, { status: llmRes.status || 500 });
    }

    let accumulatedContent = '';

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

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
                  controller.enqueue(encoder.encode('data:[DONE]\n\n'));
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
                  // Do not stop the stream, but log the error
                }
              }
            }
          }
        } catch (error: any) {
          console.error('Error reading stream:', error);
          // If a stream error occurs, send an error message to the client and close.
          controller.enqueue(encoder.encode(`data:${JSON.stringify({ content: `❌ Error streaming response: ${error.message}` })}\n\n`));
          controller.enqueue(encoder.encode('data:[DONE]\n\n')); // Signal end of stream
          // It's important to still save the partial content if any was accumulated before the error.
          if (accumulatedContent) {
            saveMessage(supabase, userId, chatSessionId, 'assistant', accumulatedContent + ` [Error: ${error.message}]`, 0);
          }
        } finally {
          // Asynchronously save the *complete* assistant message to Supabase
          // Only save if content was successfully accumulated
          if (accumulatedContent) {
            saveMessage(supabase, userId, chatSessionId, 'assistant', accumulatedContent, 0); // Assistant's emotion score can be 0 or derived if you analyze its output.
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
    // This catch block handles errors that occur *before* the streaming response is initiated.
    // Errors during stream processing are handled within the readableStream's start method.
    return NextResponse.json({ content: `🚨 An unexpected critical error occurred: ${err.message}. Please try again later.` }, { status: 500 });
  }
}
