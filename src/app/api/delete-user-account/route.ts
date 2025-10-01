// src/app/api/delete-user-account/route.ts
import { createClient } from '@supabase/supabase-js'; // Use the regular supabase client
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Initialize Supabase with the service role key for admin operations.
// The service role key has elevated privileges and MUST NOT be exposed client-side.
// It should only be used in secure server-side environments like this API route.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // Your Supabase Project URL
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Your Supabase Service Role Key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);

export async function POST(req: Request) {
  try {
    // We need a way to verify the user making the request is authenticated.
    // Use createRouteHandlerClient for this purpose to get the user's session from cookies.
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false // Important for server-side route handlers
      }
    });

    // Get the current user's session to ensure they are logged in
    const { data: { user }, error: userSessionError } = await supabase.auth.getUser();

    if (userSessionError || !user) {
      console.error("Authentication error for delete-user-account:", userSessionError?.message || "User not authenticated.");
      return NextResponse.json({ error: "Authentication required to delete an account." }, { status: 401 });
    }

    const user_id = user.id;

    // Optional: You might want to sign out the user's current session first.
    // This helps ensure the client-side session is invalidated immediately.
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.warn("Could not sign out user before account deletion:", signOutError.message);
      // It's usually safe to proceed with deletion even if sign-out fails,
      // but the user might remain logged in on their current client until refresh.
    }

    // Use the `supabaseAdmin` client to delete the user from the auth.users table.
    // This action requires the SERVICE_ROLE_KEY.
    // If you have foreign key constraints with CASCADE DELETE set up in your database,
    // deleting the user here will automatically delete all associated data (messages, profiles, memory, chat_sessions).
    // This is the most efficient and atomic way to handle full user data deletion.
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteAuthUserError) {
      console.error(`Error deleting user ${user_id} from auth.users:`, deleteAuthUserError.message);
      return NextResponse.json({ error: `Failed to delete user account: ${deleteAuthUserError.message}` }, { status: 500 });
    }

    console.log(`User account ${user_id} and associated data (if cascading deletes are configured) deleted successfully.`);
    return NextResponse.json({ message: "Your account and all associated data have been permanently deleted." }, { status: 200 });

  } catch (error: any) {
    console.error("An unexpected error occurred in /api/delete-user-account:", error.message);
    return NextResponse.json({ error: "An unexpected server error occurred during account deletion." }, { status: 500 });
  }
}