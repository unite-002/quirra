// src/app/api/chat/new/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Set runtime to nodejs for Vercel deployment, and maxDuration for serverless function timeout
export const runtime = 'nodejs';
export const maxDuration = 10; // Short duration, as this is a quick insert operation

/**
 * Handles POST requests to create a new chat session.
 * This API route will:
 * 1. Authenticate the user.
 * 2. Receive a client-generated sessionId from the request body.
 * 3. Insert a new record into the 'chat_sessions' table with the provided ID.
 * 4. Return the ID, title, and creation timestamp of the newly created session.
 */
export async function POST(req: Request) {
  // Initialize Supabase client for server-side operations using cookies for authentication
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // 1. Authenticate User: Get the current user from the Supabase session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If authentication fails or no user is found, return an unauthorized response
    if (authError || !user) {
      console.error('❌ Authentication Error in /api/chat/new:', authError?.message || 'User not found.');
      return NextResponse.json({ message: 'Authentication required to create a new chat session.' }, { status: 401 });
    }

    const userId = user.id; // Get the authenticated user's ID

    // 2. Receive client-generated sessionId: Parse the request body to get the sessionId
    const { sessionId: clientProvidedSessionId } = await req.json();

    // Validate that a sessionId was provided by the client
    if (!clientProvidedSessionId) {
      console.error('❌ Client Error: No sessionId provided for new chat session creation.');
      return NextResponse.json({ message: 'A session ID must be provided to create a new chat.' }, { status: 400 });
    }

    // 3. Insert a new chat session into the 'chat_sessions' table
    // The 'id' is provided by the client (frontend) to ensure consistency.
    // 'title' is set to a default "New Chat" and can be updated later by the frontend.
    // 'created_at' is set to the current ISO string timestamp.
    const { data, error: insertError } = await supabase
      .from('chat_sessions')
      .insert({
        id: clientProvidedSessionId, // Use the ID provided by the client (frontend)
        user_id: userId,
        title: "New Chat", // Default title for a fresh session
        created_at: new Date().toISOString(), // Record the creation timestamp
      })
      .select('id, title, created_at') // Select the fields you want to return to the client
      .single(); // Expect a single record back from the insert operation

    // Handle any errors during the database insert operation
    if (insertError) {
      console.error('❌ Supabase Error: Failed to insert new chat session:', insertError.message);
      // Specifically check for unique constraint violation (error code '23505' for PostgreSQL)
      // This might happen if the client somehow generates a duplicate UUID, though unlikely.
      if (insertError.code === '23505') {
        return NextResponse.json({ message: 'A chat session with this ID already exists. Please try again with a new ID.' }, { status: 409 });
      }
      return NextResponse.json({ message: `Failed to create new chat session: ${insertError.message}` }, { status: 500 });
    }

    // 4. Return the ID and title of the newly created session upon success
    console.log(`✅ New chat session created for user ${userId}: ${data.id}`);
    return NextResponse.json({
      id: data.id,
      title: data.title,
      created_at: data.created_at,
    }, { status: 201 }); // 201 Created status indicates successful resource creation
  } catch (err: any) {
    // Catch any unexpected errors that occur during the API route execution
    console.error('❌ Critical API Route Error in /api/chat/new:', err);
    return NextResponse.json({ message: `An unexpected error occurred: ${err.message}` }, { status: 500 });
  }
}
