// src/app/api/set-daily-focus/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'nodejs'; // Specify Node.js runtime for server-side operations
export const maxDuration = 10; // Max duration for this operation

export async function POST(req: Request) {
  try {
    const { focusText } = await req.json();
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication Error:', authError?.message || 'User not found for daily focus.');
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }

    if (!focusText || typeof focusText !== 'string' || focusText.trim() === '') {
      return NextResponse.json({ message: 'Focus text is required and must be a non-empty string.' }, { status: 400 });
    }

    const userId = user.id;
    // Get current date in 'YYYY-MM-DD' format for the 'date' column
    const today = new Date().toISOString().split('T')[0];
    // Get current timestamp for 'created_at' column
    const now = new Date().toISOString();

    // Upsert (insert or update) the daily focus for the current user and today's date
    // The 'onConflict' clause handles cases where a focus for today already exists, updating it instead of inserting a new one.
    const { data, error } = await supabase
      .from('daily_focus')
      .upsert(
        { user_id: userId, date: today, focus_text: focusText.trim(), created_at: now },
        { onConflict: 'user_id, date' } // Unique constraint to update if exists
      );

    if (error) {
      console.error('❌ Supabase Error setting daily focus:', error.message);
      return NextResponse.json({ message: `Failed to set daily focus: ${error.message}` }, { status: 500 });
    }

    console.log(`✅ Daily focus set/updated for user ${userId} for ${today}: "${focusText.trim()}"`);
    return NextResponse.json({ message: 'Daily focus updated successfully!', data });

  } catch (error: any) {
    console.error('🚨 API Route Error in set-daily-focus:', error);
    return NextResponse.json({ message: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}