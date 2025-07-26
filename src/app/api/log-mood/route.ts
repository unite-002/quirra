// src/app/api/log-mood/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'nodejs'; // Specify Node.js runtime for server-side operations
export const maxDuration = 10; // Max duration for this operation

export async function POST(req: Request) {
  try {
    const { moodLabel, sentimentScore } = await req.json();
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication Error:', authError?.message || 'User not found for mood log.');
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }

    if (!moodLabel || typeof moodLabel !== 'string' || moodLabel.trim() === '') {
      return NextResponse.json({ message: 'Mood label is required and must be a non-empty string.' }, { status: 400 });
    }
    if (typeof sentimentScore !== 'number' || sentimentScore < -1 || sentimentScore > 1) {
        return NextResponse.json({ message: 'Sentiment score must be a number between -1 and 1.' }, { status: 400 });
    }

    const userId = user.id;
    // Get current date in 'YYYY-MM-DD' format for the 'date' column (for unique constraint)
    const today = new Date().toISOString().split('T')[0];
    // Get current timestamp for 'timestamp' column
    const now = new Date().toISOString();

    // Upsert (insert or update) the mood log for the current user and today's date
    // The 'onConflict' clause handles cases where a mood for today already exists, updating it instead of inserting a new one.
    const { data, error } = await supabase
      .from('mood_logs')
      .upsert(
        { user_id: userId, date: today, mood_label: moodLabel.trim(), sentiment_score: sentimentScore, timestamp: now },
        { onConflict: 'user_id, date' } // Unique constraint to update if exists
      );

    if (error) {
      console.error('❌ Supabase Error logging mood:', error.message);
      return NextResponse.json({ message: `Failed to log mood: ${error.message}` }, { status: 500 });
    }

    console.log(`✅ Mood logged/updated for user ${userId} for ${today}: "${moodLabel.trim()}" (Score: ${sentimentScore})`);
    return NextResponse.json({ message: 'Mood logged successfully!', data });

  } catch (error: any) {
    console.error('🚨 API Route Error in log-mood:', error);
    return NextResponse.json({ message: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}