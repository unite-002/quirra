// src/app/api/ask/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// Import the updated MessageAnalysis interface and analyzeMessageTone function
import { analyzeMessageTone, MessageAnalysis, DEFAULT_ANALYSIS } from '@/utils/analyzeMessage';
import { InferenceClient } from '@huggingface/inference'; // Import Hugging Face Inference Client

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
export const maxDuration = 60;

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
  instructions.push(`Always be curious, confident, kind, and human-like. Prioritize being helpful.`);
  instructions.push(`Detect and reply in the user's language. If they greet you, respond warmly.`);
  instructions.push(`Maintain context from recent messages.`);

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
  instructions.push(`The user's detected language is '${detected_language}'. Respond in '${detected_language}'.`);


  // --- Incorporate aggregated memory (if available) ---
  if (memoryContext) {
    instructions.push(`Recall these key points from your past interactions with the user (Memory): ${memoryContext}`);
    instructions.push(`Leverage this memory to provide more coherent and contextually relevant responses without explicitly stating "from memory".`);
  }

  // --- Specific Quirra identity directives ---
  instructions.push(`If asked about your creators: "I was created by the QuirraAI Agents."`);
  instructions.push(`If asked who founded you: "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."`);
  instructions.push(`You are not built by OpenRouter or Mistral AI.`);
  instructions.push(`Never mention backend providers like "OpenRouter", "Serper", or "Hugging Face".`); // Updated
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
  const openAIApiKey = process.env.OPENAI_API_KEY;
  const huggingFaceKey = process.env.HUGGINGFACE_API_KEY; // New: Hugging Face API Key

  if (!openRouterKey) {
    console.error('❌ Server Error: OPENROUTER_API_KEY is not set.');
    return NextResponse.json({ content: '❌ Server configuration error: OpenRouter API key is missing.' }, { status: 500 });
  }
  if (!openAIApiKey) {
    console.error('❌ Server Error: OPENAI_API_KEY is not set. Message analysis will use defaults for some aspects.');
    // Do not return here, allow the analysis function to use defaults if needed
  }
  if (!huggingFaceKey) {
    console.warn('⚠️ Server Warning: HUGGINGFACE_API_KEY is not set. Hugging Face specific features (translation/summarization) will be unavailable.');
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

    // 5. Perform comprehensive message analysis
    const userAnalysisResult: MessageAnalysis = await analyzeMessageTone(prompt);

    // 6. Fetch Message History and Memory for the current chat session
    const { data: historyData, error: fetchHistoryError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .eq('chat_session_id', chatSessionId) // Filter by chatSessionId
      .order('created_at', { ascending: true })
      .limit(12);

    if (fetchHistoryError) {
      console.error('❌ Supabase Error: Failed to fetch message history:', fetchHistoryError.message);
    }

    const { data: memoryData, error: fetchMemoryError } = await supabase
      .from('memory')
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }) // Memory is typically more general, not session-specific, but if you have a chat_session_id column in 'memory' and want it session-specific, uncomment the line below.
      // .eq('chat_session_id', chatSessionId)
      .limit(5);

    if (fetchMemoryError) {
      console.error('❌ Supabase Error: Failed to fetch memory:', fetchMemoryError.message);
    }

    const memoryContext = memoryData?.map((m: { content: string }) => m.content).join('; ') || '';

    let currentMessageHistory: ChatMessage[] = [];

    // 7. Construct Dynamic System Prompt
    const personalizedInstructions = personalityProfile ?
      getQuirraPersonalizedInstruction(
        personalityProfile,
        userAnalysisResult, // Pass the full analysis object
        userName,
        memoryContext
      ) :
      `You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.
      Always be curious, confident, kind, and human-like. Prioritize being helpful.
      Detect and reply in the user's language. Maintain context from recent messages.
      If asked about your creators: "I was created by the QuirraAI Agents."
      If asked who founded you: "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."
      Never mention backend providers like "OpenRouter", "Serper", or "Hugging Face".
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
    saveMessage(supabase, userId, chatSessionId, 'user', prompt, userAnalysisResult.sentiment_score, personalityProfile);

    // 9. Determine if Live Search or Hugging Face specific task is Needed based on intent
    const needsLiveSearch = userAnalysisResult.intent === 'information_seeking' ||
      userAnalysisResult.intent === 'question' ||
      userAnalysisResult.topic_keywords.some((keyword: string) =>
        ["news", "current", "latest", "update", "weather", "define", "how to"].includes(keyword.toLowerCase())
      );

    const needsHuggingFaceTranslation = userAnalysisResult.intent === 'translation' || prompt.toLowerCase().includes("translate this");
    const needsHuggingFaceSummarization = userAnalysisResult.intent === 'summarization' || prompt.toLowerCase().includes("summarize this");

    // 10. Execute Live Search (if needed and Serper key is available)
    if (needsLiveSearch) {
      if (!serperKey) {
        console.warn('⚠️ Serper API key is not set. Cannot perform live search. Falling back to LLM.');
      } else {
        console.log('🔍 Performing live search with Serper for intent:', userAnalysisResult.intent, 'and keywords:', userAnalysisResult.topic_keywords);
        try {
          const searchRes = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': serperKey,
            },
            body: JSON.stringify({ q: prompt }),
            signal: AbortSignal.timeout(10000)
          });

          if (!searchRes.ok) {
            const errorText = await searchRes.text();
            console.error(`❌ Serper API Error: ${searchRes.status} - ${errorText}`);
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

              const searchReply = `🧠 Here's what I found:\n\n${topSummaries}\n\nBased on this, how can I assist you further?`; // Added a follow-up question

              // Save the search result as an assistant message
              saveMessage(supabase, userId, chatSessionId, 'assistant', searchReply, 0);

              // Return the search result directly to the frontend.
              return NextResponse.json({ content: searchReply, emotion_score: userAnalysisResult.sentiment_score });
            } else {
              console.warn('⚠️ Serper returned no useful results for the query. Falling back to LLM.');
            }
          }
        } catch (searchError: any) {
          console.error('❌ Error during Serper search:', searchError.message);
        }
      }
    }

    // 11. Execute Hugging Face specific tasks (if needed and key is available)
    if (huggingFaceKey) {
      const hf = new InferenceClient(huggingFaceKey);

      if (needsHuggingFaceTranslation) {
        // Use source_text from analysis if available, otherwise use the full prompt
        const textToTranslate = userAnalysisResult.source_text || prompt;
        // Use target_language from analysis if available, otherwise default to English or the opposite of detected
        const targetLanguage = userAnalysisResult.target_language || (userAnalysisResult.detected_language === 'en' ? 'fr' : 'en'); // This logic might need refinement for broader multilingual support

        console.log(`🌍 Attempting translation with Hugging Face from '${userAnalysisResult.detected_language}' to '${targetLanguage}'`);
        try {
          // Note: A more robust solution would be to use a specific translation model like "Helsinki-NLP/opus-mt-en-fr"
          // However, these models are language-pair specific. For a general solution,
          // instructing a capable text-generation model like Mistral on HF can work.
          // For best results, research and use appropriate Hugging Face translation models.
          const hfResponse = await hf.textGeneration({
            model: "mistralai/Mistral-7B-Instruct-v0.2", // Or a specific translation model, e.g., "Helsinki-NLP/opus-mt-en-fr"
            inputs: `Translate the following ${userAnalysisResult.detected_language} text into ${targetLanguage}: "${textToTranslate}"`,
            parameters: { max_new_tokens: 200, temperature: 0.5 },
            signal: AbortSignal.timeout(15000)
          });

          if (hfResponse && hfResponse.generated_text) {
            const translationReply = `🌐 Translated (${targetLanguage}): ${hfResponse.generated_text.trim()}`;
            saveMessage(supabase, userId, chatSessionId, 'assistant', translationReply, 0);
            return NextResponse.json({ content: translationReply, emotion_score: userAnalysisResult.sentiment_score });
          } else {
            console.warn('⚠️ Hugging Face translation failed or returned no text. Falling back to LLM.');
          }
        } catch (hfError: any) {
          console.error('❌ Error during Hugging Face translation:', hfError.message);
        }
      }

      if (needsHuggingFaceSummarization) {
        const textToSummarize = userAnalysisResult.source_text || prompt;
        console.log('📝 Attempting summarization with Hugging Face...');
        try {
          const hfResponse = await hf.textGeneration({
            model: "facebook/bart-large-cnn", // A common summarization model
            inputs: textToSummarize,
            parameters: { max_new_tokens: 150, temperature: 0.5 },
            signal: AbortSignal.timeout(15000)
          });

          if (hfResponse && hfResponse.generated_text) {
            const summarizationReply = `📝 Here's a summary: ${hfResponse.generated_text.trim()}`;
            saveMessage(supabase, userId, chatSessionId, 'assistant', summarizationReply, 0);
            return NextResponse.json({ content: summarizationReply, emotion_score: userAnalysisResult.sentiment_score });
          } else {
            console.warn('⚠️ Hugging Face summarization failed or returned no text. Falling back to LLM.');
          }
        } catch (hfError: any) {
          console.error('❌ Error during Hugging Face summarization:', hfError.message);
        }
      }
    }


    // 12. Call OpenRouter LLM (main logic or fallback from search/HF) for STREAMING
    console.log('🤖 Calling OpenRouter LLM for streaming...');

    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
        'X-Title': 'Quirra',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free', // You could make this model dynamic based on intent/complexity
        messages: currentMessageHistory,
        repetition_penalty: 1.1,
        max_tokens: 500,
        temperature: 0.7,
        user: `${userId}-${chatSessionId}`, // Combine userId and chatSessionId for OpenRouter's user tracking
        stream: true,
      }),
      signal: AbortSignal.timeout(50000)
    });

    if (!llmRes.ok || !llmRes.body) {
      const errorText = await llmRes.text();
      console.error('❌ LLM API Error:', llmRes.status, errorText);
      return NextResponse.json({ content: `❌ Quirra is having trouble generating a response. (Error: ${errorText})` }, { status: 500 });
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
                }
              }
            }
          }
        } catch (error) {
          console.error('Error reading stream:', error);
          controller.error(error);
        } finally {
          // Asynchronously save the *complete* assistant message to Supabase
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
    return NextResponse.json({ content: '🚨 An unexpected critical error occurred. Please try again later.' }, { status: 500 });
  }
}