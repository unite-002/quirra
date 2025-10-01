// src/app/personal-preferences/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { PersonalityOnboarding } from "@/components/PersonalityOnboarding"; // Adjust path if needed
import { ArrowLeft } from "lucide-react";

interface PersonalityProfile {
  learning_style: string;
  communication_preference: string;
  feedback_preference: string;
  preferred_name: string | null; // Added preferred_name
}

export default function PersonalPreferencesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialProfile, setInitialProfile] = useState<PersonalityProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("Error fetching user:", userError?.message);
          router.push('/sign-in'); // Redirect to sign-in if not authenticated
          return;
        }

        // Fetch the existing personality profile from the 'profiles' table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('personality_profile') // Select the JSONB column
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means "no rows found"
          console.error('Error fetching personality profile:', profileError.message);
          setError(`Error loading preferences: ${profileError.message}`);
        } else if (profileData && profileData.personality_profile) {
          // If profile exists and has personality data, set it
          setInitialProfile(profileData.personality_profile as PersonalityProfile);
        } else {
          // No existing profile or personality data, start fresh
          setInitialProfile(null);
        }
      } catch (err: any) {
        console.error("Unexpected error fetching profile:", err);
        setError(`An unexpected error occurred: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  const handleOnboardingComplete = (profile: PersonalityProfile) => {
    // When onboarding is complete, you can redirect the user
    console.log("Personality profile saved:", profile);
    router.push('/settings?profile_updated=true'); // Redirect back to settings or dashboard
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col items-center justify-center py-8 px-4 font-sans">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4" role="status">
            <span className="sr-only">Loading preferences...</span>
          </div>
          <p className="text-gray-300 text-xl font-medium">Loading your personal preferences...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait a moment while we fetch your data.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col items-center justify-center py-8 px-4 font-sans">
        <div className="text-center p-8 bg-red-800 rounded-lg border border-red-600 shadow-lg">
          <h2 className="text-3xl font-bold text-red-100 mb-4">Error Loading Preferences</h2>
          <p className="text-red-200 text-lg">{error}</p>
          <button
            onClick={() => router.push('/settings')}
            className="mt-8 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          >
            Go back to Settings
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col items-center py-8 px-4 font-sans">
      <header className="w-full max-w-3xl flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/settings")}
          className="p-2 rounded-full hover:bg-[#1a213a] transition-colors text-gray-400 hover:text-white"
          aria-label="Go back to settings"
        >
          <ArrowLeft size={28} />
        </button>
        <h1 className="text-4xl font-extrabold text-white">Personal Preferences</h1>
      </header>

      {/* The PersonalityOnboarding component is where the 4-choice logic needs to be implemented */}
      <PersonalityOnboarding onComplete={handleOnboardingComplete} initialProfile={initialProfile} />
    </main>
  );
}
