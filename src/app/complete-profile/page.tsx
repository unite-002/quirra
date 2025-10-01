// src/app/complete-profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { User, Sparkles } from 'lucide-react'; // Icons for the page

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const checkUserAndProfile = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("No user found, redirecting to sign-in:", userError?.message);
          router.push('/sign-in'); // Redirect if not logged in
          return;
        }

        // Check if user already has a profile in the 'profiles' table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', user.id)
          .single(); // Use single() as we expect at most one profile per user ID

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means "no rows found"
          console.error("Error fetching profile:", profileError.message);
          setMessage(`Error loading profile data: ${profileError.message}`);
          setLoading(false);
          return;
        }

        if (profile && profile.username) {
          // Profile already exists and has a username, redirect to chat
          console.log("Profile already complete, redirecting to chat.");
          router.push('/'); // Or '/chat' depending on your main page
          return;
        }

        // If a profile exists but is missing username, pre-fill full_name if available
        if (profile && profile.full_name) {
            setFullName(profile.full_name);
        } else if (user.user_metadata?.full_name) {
            // Also check user_metadata for full_name if profile wasn't found
            setFullName(user.user_metadata.full_name);
        }

      } catch (err) {
        console.error("Unexpected error during profile check:", err);
        setMessage("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    checkUserAndProfile();
  }, [router]);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    // Basic validation
    if (!username.trim()) {
      setMessage('Username cannot be empty.');
      setSubmitting(false);
      return;
    }
    if (username.length < 3 || username.length > 20) {
      setMessage('Username must be between 3 and 20 characters.');
      setSubmitting(false);
      return;
    }
    // Add more username validation (e.g., alphanumeric, no spaces) if desired
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      setMessage('Username can only contain letters, numbers, underscores, and periods.');
      setSubmitting(false);
      return;
    }


    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('You must be logged in to complete your profile.');
        setSubmitting(false);
        router.push('/sign-in');
        return;
      }

      // 1. Insert/Update into 'profiles' table for username
      const { error: profileUpsertError } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, username, full_name: fullName.trim() || null }, // Use upsert to create or update
          { onConflict: 'id', ignoreDuplicates: false } // Conflict on 'id' to update existing
        );

      if (profileUpsertError) {
        if (profileUpsertError.code === '23505' && profileUpsertError.message.includes('username')) {
            setMessage('This username is already taken. Please choose another.');
        } else {
            console.error("Error upserting profile:", profileUpsertError.message);
            setMessage(`Failed to save profile: ${profileUpsertError.message}`);
        }
        setSubmitting(false);
        return;
      }

      // 2. Update user_metadata for full_name (if you want to keep it in auth.users too)
      // This step is optional if you rely solely on the 'profiles' table for full_name
      // However, it's good for consistency as some parts of Supabase might use user_metadata
      const { error: metadataUpdateError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() || null },
      });

      if (metadataUpdateError) {
        console.warn("Warning: Could not update user metadata:", metadataUpdateError.message);
        // Do not block profile completion if metadata update fails, it's secondary
      }

      setMessage('Profile saved successfully! Redirecting...');
      setTimeout(() => {
        router.push('/'); // Redirect to main chat page
      }, 1500);

    } catch (err) {
      console.error("Unexpected error submitting profile:", err);
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0B1A] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-4 border-blue-500 border-opacity-75" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="ml-4 text-lg">Preparing your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0B1A] p-4">
      <div className="bg-[#1a213a] rounded-lg shadow-xl p-8 max-w-md w-full text-center border border-[#2a304e]">
        <Sparkles size={48} className="text-blue-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-3">Complete Your Profile</h2>
        <p className="text-gray-300 mb-6">Just a few more details to get started!</p>

        {message && (
          <p className={`mb-4 ${message.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmitProfile} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-left text-gray-300 text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              id="username"
              placeholder="e.g., quirky_user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-[#2a304e] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={3}
              maxLength={20}
            />
            <p className="text-xs text-gray-400 text-left mt-1">Unique identifier, only letters, numbers, underscores, and periods.</p>
          </div>
          <div>
            <label htmlFor="fullName" className="block text-left text-gray-300 text-sm font-medium mb-1">Full Name (Optional)</label>
            <input
              type="text"
              id="fullName"
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-[#2a304e] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
          >
            {submitting ? 'Saving Profile...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}