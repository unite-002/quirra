// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Correct import for Route Handlers
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies }); // Correct usage for Route Handlers
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error.message);
      return NextResponse.redirect(`${requestUrl.origin}/sign-in?error=auth_failed`);
    }
  }

  // URL to redirect to after successful sign in or sign up via email confirmation.
  // This is where the user lands after clicking the magic link in their email.
  // We redirect them to the complete-profile page.
  return NextResponse.redirect(`${requestUrl.origin}/complete-profile`);
}