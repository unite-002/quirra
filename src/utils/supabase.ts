// src/utils/supabase.ts

'use client' // This directive indicates that this module should be rendered on the client side.

import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { type Session, type SupabaseClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react' // Import useEffect and useState for the hook

// Define the shape of personality profile for type safety
interface PersonalityProfile {
  learning_style: string;
  communication_preference: string;
  feedback_preference: string;
  preferred_name: string | null;
}

// Initialize the Supabase client for client-side operations.
// This client is used throughout your frontend application to interact with Supabase.
export const supabase = createPagesBrowserClient()

// Export the Session type from Supabase for better type safety across your app.
export type { Session, SupabaseClient }

/**
 * Custom hook to get the current Supabase session.
 * This can be useful for components that need session data.
 * @returns The current Supabase Session or null.
 */
export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching Supabase session:", error.message);
      }
      setSession(session);
      setLoading(false);
    }
    getSession();

    // Listen for auth state changes to keep the session updated in real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe(); // Cleanup subscription on component unmount
    };
  }, []);

  return { session, loading };
}

/**
 * A helper function to explicitly get the current Supabase session.
 * Useful for scenarios where a hook isn't suitable (e.g., in server actions or direct utility calls).
 * @returns A Promise that resolves to the Supabase Session or null, along with any error.
 */
export async function getSupabaseSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

// *** IMPORTANT: saveMessage and saveMemory functions are NOT in this file. ***
// They are now internal to the API routes that use them.

// Add a helper for signing out
export async function signOutUser(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
  } else {
    console.log('User signed out successfully.');
  }
  return { error };
}
