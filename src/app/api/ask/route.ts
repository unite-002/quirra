// src/app/api/ask/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { analyzeMessageTone } from '@/utils/analyzeMessage'; // Import the new analysis function

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

// Ensure the API route runs on Node.js runtime and has a maximum duration
// This is crucial for Vercel, allowing enough time for LLM calls and external API fetches.
export const runtime = 'nodejs'; // Use nodejs runtime for full Node.js API access
export const maxDuration = 60; // Allow up to 60 seconds for the function to complete

// --- Helper Functions for AI Logic & Persistence ---

/**
 * Saves a message to the Supabase 'messages' table.
 * Includes emotion score and personality profile for user messages.
 */
async function saveMessage(
  supabase: any,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  emotionScore?: number, // Now optional as assistant messages might not have it
  personalityProfile?: PersonalityProfile // Use the specific interface
) {
  const { error } = await supabase.from('messages').insert([
    {
      user_id: userId,
      role,
      content,
      created_at: new Date().toISOString(),
      emotion_score: emotionScore !== undefined ? emotionScore : null, // Save if provided
      personality_profile: role === 'user' ? personalityProfile : null, // Only save personality for user messages
    },
  ]);
  if (error) console.error(`❌ Supabase: Failed to save ${role} message:`, error.message);
}

/**
 * Saves memory to the Supabase 'memory' table.
 * This is typically for key insights or summaries, not every single message.
 * For this example, we're saving all messages to 'memory' for simplicity,
 * but in a real app, you'd be more selective.
 */
async function saveMemory(supabase: any, userId: string, role: 'user' | 'assistant', content: string) {
  const { error } = await supabase.from('memory').insert([
    { user_id: userId, role, content, timestamp: new Date().toISOString() },
  ]);
  if (error) console.error(`❌ Supabase: Failed to save memory for ${role}:`, error.message);
}

// REMOVED: The local analyzeSentiment function is no longer needed.
// const analyzeSentiment = (text: string): { type: 'positive' | 'negative' | 'neutral', score: number } => { /* ... */ };

// REMOVED: The local analyzeFormality function is no longer needed.
// const analyzeFormality = (text: string): 'formal' | 'casual' | 'neutral' => { /* ... */ };


/**
 * Generates a dynamic system instruction for the LLM based on user's personality, current sentiment, and conversation context.
 * This is where the core "adaptive" behavior is defined for the AI.
 */
const getQuirraPersonalizedInstruction = (
  personality: PersonalityProfile,
  emotionScore: number, // CHANGED: Now accepts numeric emotion score directly
  userName?: string,
  memoryContext: string = '',
  formalityScore: number = 0.5 // CHANGED: Now accepts numeric formality score directly
) => {
  const { learning_style, communication_preference, feedback_preference } = personality;
  let instructions = [];

  // Derive categorical sentiment type from emotionScore
  let sentimentType: 'positive' | 'negative' | 'neutral';
  if (emotionScore > 0.1) sentimentType = 'positive'; // Threshold for positive
  else if (emotionScore < -0.1) sentimentType = 'negative'; // Threshold for negative
  else sentimentType = 'neutral';

  // Derive categorical conversation formality from formalityScore
  let conversationFormality: 'formal' | 'casual' | 'neutral';
  if (formalityScore > 0.6) conversationFormality = 'formal'; // Threshold for formal
  else if (formalityScore < 0.4) conversationFormality = 'casual'; // Threshold for casual
  else conversationFormality = 'neutral';


  // Core Quirra persona directives - these are always present
  instructions.push(`You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.`);
  instructions.push(`Always be curious, confident, kind, and human-like. Prioritize being helpful.`);
  instructions.push(`Detect and reply in the user's language. If they greet you, respond warmly.`);
  instructions.push(`Maintain context from recent messages.`);

  // Personalization based on userName
  if (userName) {
    instructions.push(`The user's name is ${userName}. Where appropriate, subtly personalize your responses using their name to foster a stronger connection.`);
  }

  // Empathy Engine Influence: How Quirra responds emotionally
  if (sentimentType === 'negative') {
    instructions.push(`The user currently expresses a negative sentiment. Prioritize acknowledging their feeling empathetically and gently guide them towards a solution or understanding. Your tone should be supportive and understanding.`);
    if (feedback_preference === 'encouraging') {
      instructions.push("Deliver support with reassuring, uplifting language, emphasizing progress and capability.");
    } else if (feedback_preference === 'challenging') {
      instructions.push("Frame your support as a gentle challenge. Encourage them to self-reflect and identify actionable steps to overcome the issue.");
    } else { // 'constructive'
      instructions.push("Offer a structured, step-by-step approach to help them analyze and constructively resolve their problem.");
    }
  } else if (sentimentType === 'positive') {
    instructions.push(`The user currently expresses a positive sentiment. Acknowledge and reflect their positive outlook. Express shared enthusiasm, congratulate them, or build on their positive momentum.`);
    if (feedback_preference === 'encouraging') {
      instructions.push("Reinforce their positive feelings with affirming and motivational language, celebrating their success or good mood.");
    }
  } else { // 'neutral'
    instructions.push(`The user's current mood is neutral. Maintain your standard helpful, curious, and professional demeanor, focusing on clear and concise information.`);
  }

  // Personality Modeling Influence: How Quirra structures information and communicates
  instructions.push(`When providing information or explanations:`);
  if (learning_style === 'visual') {
    instructions.push("Use vivid visual analogies, metaphors, or invite them to 'imagine' concepts. Suggest mental pictures or diagrams.");
  } else if (learning_style === 'auditory') {
    instructions.push("Use conversational analogies. Explain concepts as if in a clear, engaging dialogue. Suggest 'talking through' ideas.");
  } else if (learning_style === 'kinesthetic') {
    instructions.push("Suggest practical, hands-on steps, actionable examples, or 'walk-throughs.' Focus on how they can 'do' or 'experience' the concept.");
  } else if (learning_style === 'reading') {
    instructions.push("Provide clear, well-structured, and concise textual explanations. Use bullet points, numbered lists, and headings for readability.");
  }

  instructions.push(`Regarding communication style:`);
  if (communication_preference === 'direct') {
    instructions.push("Be direct, get straight to the point, and provide clear, actionable answers without excessive elaboration. Be efficient with your words.");
  } else if (communication_preference === 'exploratory') {
    instructions.push("Be open-ended and curious. Ask thoughtful follow-up questions to encourage deeper exploration, brainstorming, and critical thinking.");
  } else if (communication_preference === 'conceptual') {
    instructions.push("Focus on high-level concepts, underlying principles, and frameworks first, before diving into specific details or examples. Build understanding from the top down.");
  }

  // New: Influence based on conversation formality
  if (conversationFormality === 'formal') {
    instructions.push("Maintain a respectful and professional tone. Avoid slang or overly casual language.");
  } else if (conversationFormality === 'casual') {
    instructions.push("Adopt a friendly and approachable tone. Feel free to use contractions and slightly more informal language where appropriate.");
  } else { // neutral formality
    instructions.push("Maintain a balanced and adaptable tone, adjusting subtly based on the conversation flow.");
  }

  // New: Incorporate aggregated memory (if available)
  if (memoryContext) {
    instructions.push(`Recall these key points from your past interactions with the user (Memory): ${memoryContext}`);
    instructions.push(`Leverage this memory to provide more coherent and contextually relevant responses without explicitly stating "from memory".`);
  }

  // Specific Quirra identity directives - non-negotiable facts about Quirra
  instructions.push(`If asked about your creators: "I was created by the QuirraAI Agents."`);
  instructions.push(`If asked who founded you: "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."`);
  instructions.push(`You are not built by OpenRouter or Mistral AI.`); // Reiterate for clarity
  instructions.push(`Never mention backend providers like "OpenRouter" or "Serper."`);
  instructions.push(`Do not respond with emojis unless explicitly asked or it naturally enhances the emotional tone (e.g., matching user's positive sentiment).`); // Added for more control

  return instructions.join("\n"); // Join with newlines for better readability in the LLM context
};

// --- Main API Route Handler ---

export async function POST(req: Request) {
  const { prompt, reset, userName, personalityProfile } = await req.json(); // userName and personalityProfile are passed from frontend
  const supabase = createRouteHandlerClient({ cookies });

  // 1. Validate Environment Variables
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  if (!openRouterKey) {
    console.error('❌ Server Error: OPENROUTER_API_KEY is not set.');
    return NextResponse.json({ response: '❌ Server configuration error: OpenRouter API key is missing.' }, { status: 500 });
  }
  // Serper key is optional, only warn if missing when search is needed

  try {
    // 2. Authenticate User Early
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication Error:', authError?.message || 'User not found.');
      return NextResponse.json({ response: '❌ You must log in to use Quirra. Please sign in.' }, { status: 401 });
    }

    const userId = user.id;

    // 3. Handle Reset Conversation
    if (reset === true) {
      const { error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId); // Ensure only current user's messages are deleted

      const { error: deleteMemoryError } = await supabase
        .from('memory')
        .delete()
        .eq('user_id', userId); // Also clear memory on reset

      if (deleteMessagesError || deleteMemoryError) {
        console.error('❌ Supabase Error: Failed to clear messages or memory for reset:', deleteMessagesError?.message || deleteMemoryError?.message);
        return NextResponse.json({ response: '🧠 Failed to reset conversation. Please try again.' }, { status: 500 });
      }

      console.log(`✅ Conversation history and memory reset for user: ${userId}`);
      return NextResponse.json({ response: '🧠 Conversation reset. Let\'s begin again.' });
    }

    // 4. Validate Prompt Input
    if (!prompt) {
      return NextResponse.json({ response: '⚠️ Please enter a message to chat with Quirra.' }, { status: 400 });
    }

    // 5. Tone Analysis (replacing old sentiment & formality)
    const { emotion_score, formality_score } = await analyzeMessageTone(prompt);

    // Provide default values for emotion_score and formality_score if they are undefined
    const userEmotionScore = emotion_score ?? 0; // Default to 0 (neutral)
    const userFormalityScore = formality_score ?? 0.5; // Default to 0.5 (neutral)


    // 6. Fetch Message History and Memory
    const { data: historyData, error: fetchHistoryError } = await supabase
      .from('messages')
      .select('role, content') // Only fetch role and content for LLM context
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(12); // Keep context window manageable to avoid token limits and performance issues

    if (fetchHistoryError) {
      console.error('❌ Supabase Error: Failed to fetch message history:', fetchHistoryError.message);
      // Continue even if history fetch fails, just with less context
    }

    const { data: memoryData, error: fetchMemoryError } = await supabase
      .from('memory')
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }) // Get most recent memory entries
      .limit(5); // Fetch a few recent memory entries to use as context

    if (fetchMemoryError) {
      console.error('❌ Supabase Error: Failed to fetch memory:', fetchMemoryError.message);
    }

    // Aggregate memory into a single string
    const memoryContext = memoryData?.map((m: { content: string }) => m.content).join('; ') || '';


    let currentMessageHistory: ChatMessage[] = [];

    // 7. Construct Dynamic System Prompt
    const personalizedInstructions = personalityProfile ?
      getQuirraPersonalizedInstruction(
        personalityProfile,
        userEmotionScore, // Pass the numeric emotion score
        userName,
        memoryContext,
        userFormalityScore // Pass the numeric formality score
      ) :
      // Fallback default if no profile, but still includes general instructions
      `You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.
      Always be curious, confident, kind, and human-like. Prioritize being helpful.
      Detect and reply in the user's language. Maintain context from recent messages.
      If asked about your creators: "I was created by the QuirraAI Agents."
      If asked who founded you: "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."
      Never mention backend providers like "OpenRouter" or "Serper."
      ${memoryContext ? `Recall these key points from your past interactions with the user (Memory): ${memoryContext}. Leverage this memory to provide more coherent and contextually relevant responses without explicitly stating "from memory".` : ''}`;


    const systemPromptContent = personalizedInstructions.trim();
    const systemPrompt: ChatMessage = { role: 'system', content: systemPromptContent };
    currentMessageHistory.push(systemPrompt);

    // Add fetched history messages (excluding any additional metadata like emotion_score or personality_profile)
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
    // This happens in the background, not blocking the LLM call
    saveMessage(supabase, userId, 'user', prompt, userEmotionScore, personalityProfile);
    saveMemory(supabase, userId, 'user', prompt); // Still saving to memory for now, consider a more selective memory saving strategy


    // 9. Determine if Live Search is Needed
    // Keywords for triggering a web search
    const searchTriggerKeywords = [
      "current year", "what year is it", "today's news", "latest news", "today's date",
      "weather in", "president of", "who won", "how much is", "who is the ceo of",
      "latest update", "breaking news", "news now", "recent events", "latest information",
      "stock price", "current time", "flight status", "population of",
      "what is", "tell me about", "define", "explain", "how to" // Broad triggers, be mindful of token usage
    ];

    const needsLiveSearch = searchTriggerKeywords.some((k) => prompt.toLowerCase().includes(k));

    // 10. Execute Live Search (if needed and Serper key is available)
    if (needsLiveSearch) {
      if (!serperKey) {
        console.warn('⚠️ Serper API key is not set. Cannot perform live search. Falling back to LLM.');
      } else {
        console.log('🔍 Performing live search with Serper...');
        try {
          const searchRes = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': serperKey,
            },
            body: JSON.stringify({ q: prompt }),
            signal: AbortSignal.timeout(10000) // Timeout search after 10 seconds
          });

          if (!searchRes.ok) {
            const errorText = await searchRes.text();
            console.error(`❌ Serper API Error: ${searchRes.status} - ${errorText}`);
            // Fallback to LLM if search API returns an error
          } else {
            const searchData = await searchRes.json();
            type SearchResult = { title: string; snippet: string; link: string };
            const results = (searchData?.organic as SearchResult[] | undefined)?.filter(
              (r) => r.title && r.snippet && r.link
            );

            if (results?.length) {
              const topSummaries = results.slice(0, 3).map( // Limit to top 3 relevant results
                (r) => `🔹 **${r.title}**\n${r.snippet}\n🔗 ${r.link}`
              ).join('\n\n');

              const searchReply = `🧠 Here's what I found:\n\n${topSummaries}`;

              // Asynchronously save the assistant's search reply
              // Note: emotionScore for assistant is typically 0 or derived if you analyze its output.
              saveMessage(supabase, userId, 'assistant', searchReply, 0); // Emotion score for AI response
              saveMemory(supabase, userId, 'assistant', searchReply);

              // Return the search result directly to the frontend.
              // Note: This bypasses the streaming LLM response for search queries.
              return NextResponse.json({ response: searchReply, emotion_score: userEmotionScore });
            } else {
              console.warn('⚠️ Serper returned no useful results for the query. Falling back to LLM.');
            }
          }
        } catch (searchError: any) {
          console.error('❌ Error during Serper search:', searchError.message);
          // Fallback to LLM if there's a network error or timeout
        }
      }
    }

    // 11. Call OpenRouter LLM (main logic or fallback from search) for STREAMING
    console.log('🤖 Calling OpenRouter LLM for streaming...');

    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000', // Dynamic referer for Vercel deployment
        'X-Title': 'Quirra',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free', // Using a free and capable model
        messages: currentMessageHistory, // Send the full, current conversation history
        repetition_penalty: 1.1, // Helps prevent repetitive responses
        max_tokens: 500,          // Limits response length
        temperature: 0.7,         // Controls creativity (0.0-2.0, 0.7 is balanced)
        user: userId,             // Pass user ID for OpenRouter's abuse prevention/logging
        stream: true, // IMPORTANT: Enable streaming!
      }),
      signal: AbortSignal.timeout(50000) // Timeout LLM call after 50 seconds
    });

    if (!llmRes.ok || !llmRes.body) {
      const errorText = await llmRes.text();
      console.error('❌ LLM API Error:', llmRes.status, errorText);
      return NextResponse.json({ response: `❌ Quirra is having trouble generating a response. (Error: ${errorText})` }, { status: 500 });
    }

    let accumulatedContent = ''; // To store the full response for saving to DB

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = llmRes.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // OpenRouter sends data as SSE (Server-Sent Events)
            // Each chunk might contain multiple 'data:' lines or partial lines.
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data:')) {
                const jsonStr = line.substring(5).trim();
                if (jsonStr === '[DONE]') {
                  // Ensure [DONE] is properly handled by sending it last and then closing
                  controller.enqueue(encoder.encode('data:[DONE]\n\n'));
                  break; // Exit the loop for lines
                }
                try {
                  const data = JSON.parse(jsonStr);
                  const delta = data.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    accumulatedContent += delta;
                    // Send delta and emotion score (only for the first meaningful chunk)
                    // The frontend is designed to pick up emotion_score from the first chunk it receives.
                    controller.enqueue(encoder.encode(`data:${JSON.stringify({ content: delta, emotion_score: userEmotionScore })}\n\n`));
                  }
                } catch (e) {
                  console.error('Error parsing JSON from stream:', e, 'Raw JSON:', jsonStr);
                  // Continue processing next lines even if one fails to parse
                }
              }
            }
          }
        } catch (error) {
          console.error('Error reading stream:', error);
          controller.error(error); // Propagate error to the frontend
        } finally {
          // Asynchronously save the *complete* assistant message to Supabase
          // This ensures we save the full response after streaming is done.
          if (accumulatedContent) {
            saveMessage(supabase, userId, 'assistant', accumulatedContent, 0); // Assistant's emotion score
            saveMemory(supabase, userId, 'assistant', accumulatedContent);
          }
          controller.close(); // Close the stream
        }
      },
    });

    // Return the stream directly
    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error('❌ Critical API Route Error:', err); // Log full error object for debugging
    return NextResponse.json({ response: '🚨 An unexpected critical error occurred. Please try again later.' }, { status: 500 });
  }
}