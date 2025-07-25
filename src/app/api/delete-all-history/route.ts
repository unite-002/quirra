// src/app/api/delete-all-history/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      console.error("Authentication error for delete-all-history:", sessionError?.message || "User not authenticated.");
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const user_id = session.user.id;

    // Start a transaction (optional, but good for ensuring atomicity)
    // Supabase doesn't directly support server-side transactions with client libraries easily,
    // so we'll do sequential deletes and handle errors.
    // For true atomicity, a Supabase function (Postgres function) would be ideal.

    // 1. Delete all messages for the user
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('user_id', user_id);

    if (messagesError) {
      console.error("Error deleting messages:", messagesError.message);
      return NextResponse.json({ error: `Failed to delete messages: ${messagesError.message}` }, { status: 500 });
    }

    // 2. Delete all chat sessions for the user
    // Assuming you have a 'chat_sessions' table that stores session IDs or context
    const { error: sessionsError } = await supabase
      .from('chat_sessions') // Make sure this is the correct table name for your chat sessions
      .delete()
      .eq('user_id', user_id);

    if (sessionsError) {
      console.error("Error deleting chat sessions:", sessionsError.message);
      return NextResponse.json({ error: `Failed to delete chat sessions: ${sessionsError.message}` }, { status: 500 });
    }

    // 3. Delete all memory for the user (if 'memory' is a separate table from 'messages' and 'chat_sessions')
    const { error: memoryError } = await supabase
      .from('memory') // Make sure this is the correct table name for user memory
      .delete()
      .eq('user_id', user_id);

    if (memoryError) {
      console.error("Error deleting memory:", memoryError.message);
      return NextResponse.json({ error: `Failed to delete memory: ${memoryError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "Chat history, sessions, and memory deleted successfully." }, { status: 200 });

  } catch (error: any) {
    console.error("Unexpected error in delete-all-history API:", error.message);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}