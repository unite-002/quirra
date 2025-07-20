import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Define the shape of a message for clarity
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ✅ Save message to Supabase
// This function will be called directly in the route handler
async function saveMessage(supabase: any, userId: string, role: 'user' | 'assistant', content: string) {
  const { error } = await supabase.from('messages').insert([
    { user_id: userId, role, content, created_at: new Date().toISOString() }, // Add created_at
  ]);
  if (error) console.error(`❌ Failed to save ${role} message:`, error.message);
}

// ✅ Save memory to Supabase (assuming 'memory' table is for deeper, long-term summaries/facts)
async function saveMemory(supabase: any, userId: string, role: 'user' | 'assistant', content: string) {
  const { error } = await supabase.from('memory').insert([
    { user_id: userId, role, content, timestamp: new Date().toISOString() }, // Ensure timestamp is ISO string
  ]);
  if (error) console.error(`❌ Failed to save memory for ${role}:`, error.message);
}

export async function POST(req: Request) {
  const { prompt, reset, userName, userMood } = await req.json(); // Destructure userName and userMood
  const supabase = createRouteHandlerClient({ cookies });

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Authentication error:', authError?.message || 'User not found.');
    return NextResponse.json({ response: '❌ You must log in to use Quirra.' }, { status: 401 });
  }

  const userId = user.id;

  if (!openRouterKey) {
    return NextResponse.json({ response: '❌ Missing OpenRouter API key.' }, { status: 500 });
  }

  // ✅ Handle reset logic: Delete all messages for the current user
  if (reset === true) {
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Failed to clear messages for reset:', deleteError.message);
      return NextResponse.json({ response: '🧠 Failed to reset conversation. Please try again.' }, { status: 500 });
    }

    console.log(`✅ Conversation history reset for user: ${userId}`);
    return NextResponse.json({ response: '🧠 Conversation reset. Let\'s begin again.' });
  }

  if (!prompt) { // Prompt is required if not a reset
    return NextResponse.json({ response: '⚠️ Enter a prompt.' }, { status: 400 });
  }

  try {
    // 1. Fetch relevant message history from Supabase for the current user
    const { data: historyData, error: fetchHistoryError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }) // Order by timestamp to maintain conversation flow
      .limit(12); // Fetch last 12 messages to keep context reasonable

    if (fetchHistoryError) {
      console.error('❌ Failed to fetch message history:', fetchHistoryError.message);
      // Proceed with only system prompt if history fetch fails
    }

    let currentMessageHistory: ChatMessage[] = [];

    // Construct the dynamic system prompt
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: `
You are Quirra, a next-generation multilingual AI assistant developed by the QuirraAI Agents.
You are not built by OpenRouter or Mistral AI. Founded by Hatem Hamdy to empower users with intelligence, creativity, and reasoning.

The current user is ${userName || 'a user'} and their current mood is ${userMood || 'unknown'}. Use this to personalize your responses where appropriate.

✅ Detect and reply in the user's language.
🌍 Greet warmly if they say "hi", "hello", etc.
🧠 Maintain context across recent messages.
🔄 If they ask to translate, switch languages seamlessly.
🏛️ If asked about creators:
- "Who created you?" → "I was created by the QuirraAI Agents."
- "Who founded you?" → "Quirra was founded by Hatem Hamdy — a visionary focused on ethical AI."

🎯 You assist with reasoning, coding, writing, research, translation, summaries, and more.
🎨 Future-ready: image generation, uploads, voice.
⚠️ Never mention backend providers or "OpenRouter" or "Serper".
✨ Always be curious, confident, kind, and human-like.
    `.trim(),
    };

    currentMessageHistory.push(systemPrompt);

    // Add fetched history (if any)
    if (historyData) {
      currentMessageHistory = currentMessageHistory.concat(historyData as ChatMessage[]);
    }

    // Add current user prompt
    const userMsg: ChatMessage = { role: 'user', content: prompt };
    currentMessageHistory.push(userMsg);

    // Asynchronously save user message to database
    saveMessage(supabase, userId, 'user', prompt);
    saveMemory(supabase, userId, 'user', prompt); // Assuming you want to save all interactions to 'memory' too

    const needsLiveSearch = [
      "current year", "what year is it", "today's news", "latest news", "today's date",
      "weather", "president of", "who won", "how much is", "who is the ceo of",
      "latest update", "breaking news", "news now", "recent events", "latest information"
    ].some((k) => prompt.toLowerCase().includes(k));

    // ✅ If query matches search keywords & SERPER API is available
    if (needsLiveSearch && serperKey) {
      console.log('🔍 Performing live search with Serper...');
      const searchRes = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': serperKey,
        },
        body: JSON.stringify({ q: prompt }),
      });

      const searchData = await searchRes.json();

      type SearchResult = { title: string; snippet: string; link: string };
      const results = (searchData?.organic as SearchResult[] | undefined)?.filter(
        (r) => r.title && r.snippet && r.link
      );

      if (results?.length) {
        const topSummaries = results.slice(0, 3).map(
          (r) => `🔹 **${r.title}**\n${r.snippet}\n🔗 ${r.link}`
        ).join('\n\n');

        const searchReply = `🧠 Here's what I found:\n\n${topSummaries}`;

        // Asynchronously save assistant search reply
        saveMessage(supabase, userId, 'assistant', searchReply);
        saveMemory(supabase, userId, 'assistant', searchReply);

        return NextResponse.json({ response: searchReply });
      } else {
        console.warn('⚠️ Serper returned no useful results. Falling back to LLM.');
      }
    }

    // ✅ Fallback: Use OpenRouter LLM
    console.log('🤖 Calling OpenRouter LLM...');
    // Send the constructed message history (system + fetched history + current user prompt)
    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://quirra.vercel.app',
        'X-Title': 'Quirra',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: currentMessageHistory, // Send the full, current conversation history
        // Add repetition_penalty to reduce repetitive outputs
        repetition_penalty: 1.1, // Adjust this value (e.g., 1.05 to 1.2) if needed
        max_tokens: 500, // Limit response length to prevent rambling
        temperature: 0.7, // Adjust creativity (0.0 for factual, 1.0 for creative)
      }),
    });

    const llmData = await llmRes.json();

    if (llmData.error) {
      console.error('❌ LLM API error:', llmData.error);
      return NextResponse.json({ response: `❌ Quirra is having trouble understanding. Please try again or rephrase. (Error: ${llmData.error.message || 'unknown'})` }, { status: 500 });
    }

    const aiReply = llmData.choices?.[0]?.message?.content?.trim();
    if (!aiReply) {
      console.warn('⚠️ LLM returned an empty response.');
      return NextResponse.json({ response: '⚠️ Quirra didn\'t generate a response. Please try again.' }, { status: 500 });
    }

    // Asynchronously save assistant message to database
    saveMessage(supabase, userId, 'assistant', aiReply);
    saveMemory(supabase, userId, 'assistant', aiReply); // Also save to memory

    return NextResponse.json({ response: aiReply });
  } catch (err: any) {
    console.error('❌ Unexpected error in API route:', err.message || err);
    return NextResponse.json({ response: '⚠️ An unexpected error occurred. Please try again later.' }, { status: 500 });
  }
}