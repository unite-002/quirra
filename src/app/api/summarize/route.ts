// src/app/api/summarize/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 30;

// --- OpenRouter Configuration ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY_HERE';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Define the shape of personality profile for type safety (copied from chat/page.tsx)
// This interface is only here for type clarity if needed, but not directly used in saveMemory itself.
interface PersonalityProfile {
  learning_style: string;
  communication_preference: string;
  feedback_preference: string;
  preferred_name: string | null;
}

/**
 * Saves memory snapshot to memory table.
 * This function is now internal to this API route.
 * @param supabase The Supabase client instance.
 * @param role The role or type of memory ('system' | 'summary' | etc.).
 * @param content The content of the memory snapshot.
 * @param user_id The ID of the user associated with the memory.
 * @param chat_session_id Optional: The ID of the chat session this memory is specific to (if applicable).
 */
async function saveMemory(
  supabase: any, // Use 'any' for Supabase client to avoid complex type imports here
  role: string,
  content: string,
  user_id: string,
  chat_session_id?: string
): Promise<void> {
  const { error } = await supabase.from('memory').insert([
    {
      user_id,
      chat_session_id: chat_session_id || null,
      role,
      content,
      timestamp: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error('❌ Server Supabase: Failed to save memory:', error.message);
  } else {
    console.log('✅ Server Supabase: Memory saved.');
  }
}

/**
 * Handles POST requests to summarize chat messages and save to memory.
 */
export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  // Crucial check for OpenRouter API key
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY_HERE') {
    console.error('❌ Server Error: OPENROUTER_API_KEY is not set. Cannot perform summarization.');
    return NextResponse.json({ message: 'Server configuration error: OpenRouter API key is missing. This is essential for summarization.' }, { status: 500 });
  }

  try {
    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication Error in /api/summarize:', authError?.message || 'User not found.');
      return NextResponse.json({ message: 'Authentication required to summarize conversations.' }, { status: 401 });
    }

    const userId = user.id;

    // 2. Receive messages to summarize and session ID
    const { chatSessionId, messagesToSummarize } = await req.json();

    if (!chatSessionId || !messagesToSummarize || !Array.isArray(messagesToSummarize) || messagesToSummarize.length === 0) {
      console.error('❌ Invalid input for /api/summarize: chatSessionId or messagesToSummarize missing/invalid.');
      return NextResponse.json({ message: 'Invalid input for summarization.' }, { status: 400 });
    }

    // Prepare messages for OpenRouter summarization
    const messagesForSummarization = [
      {
        role: 'system' as const,
        content: `You are an expert summarizer. Your task is to extract the key topics, decisions, and important information from the following conversation snippets. Be concise and capture the essence for long-term memory. Focus on the user's goals, preferences, and any recurring themes. If the conversation is short, just return the main point. If it's a greeting, return "User initiated a new chat."`,
      },
      ...messagesToSummarize.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const, // Explicitly cast roles
        content: msg.content,
      })),
    ];

    // 3. Use OpenRouter to generate a concise summary
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'YOUR_SITE_URL_HERE', // Replace with your actual site URL
        'X-Title': 'Quirra AI Prototype - Summarization', // Replace with your app title
      },
      body: JSON.stringify({
        model: 'Meta Llama 4 Maverick (free)', // A cost-effective and capMeta Llama 4 Maverick (free)able model for summarization
        messages: messagesForSummarization,
        temperature: 0.2, // Low temperature for factual, consistent summaries
        max_tokens: 150, // Keep summaries concise
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout for summarization
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ OpenRouter Summarization API HTTP error: ${response.status} - ${response.statusText}`, errorData);
      throw new Error(`OpenRouter API Error during summarization: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const summaryContent = data.choices?.[0]?.message?.content?.trim();

    if (!summaryContent) {
      console.warn('⚠️ OpenRouter returned an empty summary for session:', chatSessionId);
      return NextResponse.json({ message: 'No summary generated.' }, { status: 200 });
    }

    // 4. Save this summary to the 'memory' table using the internal saveMemory function
    await saveMemory(
      supabase, // Pass the supabase client
      'summary', // Role for this memory entry
      summaryContent,
      userId,
      chatSessionId // Link memory to the specific chat session
    );

    console.log(`✅ Summary saved for session ${chatSessionId}: ${summaryContent.substring(0, 50)}...`);
    return NextResponse.json({ message: 'Conversation summarized and memory updated.', summary: summaryContent }, { status: 200 });

  } catch (err: any) {
    console.error('❌ API Error in /api/summarize:', err);
    let statusCode = 500;
    let message = 'An unexpected error occurred during summarization.';

    // Check for specific error types from fetch or JSON parsing
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        statusCode = 503; // Service Unavailable
        message = 'Network error connecting to the summarization service.';
    } else if (err.message.includes('timeout')) {
        statusCode = 504; // Gateway Timeout
        message = 'Summarization request timed out.';
    } else if (err.message.includes('OpenRouter API Error')) {
        statusCode = err.status || 500; // Use status from OpenRouter if available
        message = `OpenRouter API Error during summarization: ${err.message}`;
    }

    return NextResponse.json({ message: `Failed to summarize conversation: ${message}` }, { status: statusCode });
  }
}
