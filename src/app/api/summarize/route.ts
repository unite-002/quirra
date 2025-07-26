
// src/app/api/summarize/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Prepare messages for OpenAI summarization
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

    // 3. Use OpenAI to generate a concise summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // A cost-effective model for summarization
      messages: messagesForSummarization,
      temperature: 0.2, // Low temperature for factual, consistent summaries
      max_tokens: 150, // Keep summaries concise
    });

    const summaryContent = completion.choices[0].message.content?.trim();

    if (!summaryContent) {
      console.warn('⚠️ OpenAI returned an empty summary for session:', chatSessionId);
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

    if (err.name === 'AuthenticationError') {
      statusCode = 401;
      message = 'Authentication failed.';
    } else if (err.name === 'BadRequestError') {
      statusCode = 400;
      message = 'Invalid request for summarization.';
    } else if (err.name === 'APIError') {
      statusCode = err.status || 500;
      message = `OpenAI API Error during summarization: ${err.message}`;
    }

    return NextResponse.json({ message: `Failed to summarize conversation: ${message}` }, { status: statusCode });
  }
}