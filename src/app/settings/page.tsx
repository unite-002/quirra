// src/app/settings/page.tsx (UPDATED)
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, User, Lock, Trash2, Bell, Mail, Save } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useState, useEffect } from "react";

// Define an interface for the profile data you expect to fetch
// UPDATED: Now includes personality profile fields
interface UserProfile {
  username: string;
  full_name: string | null;
  learning_style: string | null;
  communication_preference: string | null;
  feedback_preference: string | null;
}

export default function SettingsPage() {
  const router = useRouter();

  // State for profile information
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');

  // NEW: State for personality profile fields
  const [learningStyle, setLearningStyle] = useState<string>('');
  const [communicationPreference, setCommunicationPreference] = useState<string>('');
  const [feedbackPreference, setFeedbackPreference] = useState<string>('');

  // State for delete chat history
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  // --- Profile Loading and Update Logic ---
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoadingProfile(true);
      setProfileMessage(null);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('Error fetching user for settings:', userError?.message);
          setProfileMessage(`Error loading profile: ${userError?.message}`);
          router.push('/sign-in');
          return;
        }

        setEmail(user.email ?? null);

        // Fetch user profile from the 'profiles' table, including new fields
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, full_name, learning_style, communication_preference, feedback_preference') // UPDATED: Select new fields
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means "no rows found"
          console.error('Error fetching user profile:', profileError.message);
          setProfileMessage(`Error loading profile details: ${profileError.message}`);
        } else if (profile) {
          // If profile exists, set all relevant state variables
          setUsername(profile.username);
          setFullName(profile.full_name || '');
          setLearningStyle(profile.learning_style || ''); // NEW
          setCommunicationPreference(profile.communication_preference || ''); // NEW
          setFeedbackPreference(profile.feedback_preference || ''); // NEW
        } else {
          // If no profile found, but user exists, pre-fill full_name from user_metadata if available
          setFullName(user.user_metadata?.full_name || '');
          setUsername(null); // Explicitly set username to null if not found in profiles
          // Set default values for new personality fields if no profile exists
          setLearningStyle('');
          setCommunicationPreference('');
          setFeedbackPreference('');
          setProfileMessage('Your profile is not fully set up. Please complete your profile.'); // Optional message
        }

      } catch (err) {
        console.error('Unexpected error fetching user or profile for settings:', err);
        setProfileMessage('An unexpected error occurred while loading profile.');
        router.push('/sign-in');
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserAndProfile();
  }, [router]);

  // Handle profile update logic
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfileMessage('You must be logged in to update your profile.');
        setLoadingProfile(false);
        router.push('/sign-in');
        return;
      }

      // Prepare the profile data to be upserted
      const profileDataToSave = {
        id: user.id,
        username: username, // Ensure username is not null here, add validation if needed
        full_name: fullName.trim() || null,
        learning_style: learningStyle.trim() || null,         // NEW
        communication_preference: communicationPreference.trim() || null, // NEW
        feedback_preference: feedbackPreference.trim() || null,     // NEW
      };

      // Upsert to 'profiles' table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          profileDataToSave,
          { onConflict: 'id', ignoreDuplicates: false }
        );

      if (profileError) {
        console.error('Error updating profile:', profileError.message);
        setProfileMessage(`Failed to update profile: ${profileError.message}`);
      } else {
        // Also update user_metadata for full_name for consistency (optional but good practice)
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { full_name: fullName.trim() || null },
        });

        if (metadataError) {
          console.warn('Warning: Failed to update user_metadata:', metadataError.message);
        }

        setProfileMessage('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Unexpected error during profile update:', err);
      setProfileMessage('An unexpected error occurred during profile update.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // --- Delete Chat History Logic ---
  const handleDeleteChatHistory = async () => {
    // Replaced confirm() with a custom modal/message box for better UX in an iframe environment
    // For this example, I'll use a simple alert for brevity, but recommend a custom modal.
    if (!window.confirm("Are you sure you want to delete ALL chat history? This action cannot be undone.")) {
      return;
    }

    setDeleteLoading(true);
    setDeleteMessage(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user?.id) {
        console.error("Error getting user session for deletion:", sessionError?.message || "User not logged in.");
        setDeleteMessage("Error: Could not retrieve user. Please log in again.");
        setDeleteLoading(false);
        return;
      }

      const user_id = session.user.id;

      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', user_id);

      // Also delete memory associated with the user
      const { error: deleteMemoryError } = await supabase
        .from('memory')
        .delete()
        .eq('user_id', user_id);


      if (deleteError || deleteMemoryError) {
        console.error("Failed to delete chat history or memory:", deleteError?.message || deleteMemoryError?.message);
        setDeleteMessage(`Failed to delete history: ${deleteError?.message || deleteMemoryError?.message}`);
      } else {
        console.log("Chat history and memory deleted successfully.");
        setDeleteMessage("Chat history and memory deleted successfully!");
        setTimeout(() => {
          router.push("/");
        }, 1500);
      }
    } catch (err) {
      console.error("An unexpected error occurred during chat history deletion:", err);
      setDeleteMessage("An unexpected error occurred during deletion.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col items-center py-8 px-4">
      {/* Header */}
      <header className="w-full max-w-2xl flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-full hover:bg-[#1a213a] transition-colors text-gray-400 hover:text-white"
          aria-label="Go back to chat"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
      </header>

      {/* Settings Content */}
      <section className="w-full max-w-2xl bg-[#1a213a] rounded-lg shadow-lg border border-[#2a304e] p-6 space-y-6">
        {/* Account Settings */}
        <div className="border-b border-[#2a304e] pb-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User size={20} /> Account
          </h2>
          <div className="space-y-3">
            {/* Profile Information directly on this page */}
            <div className="flex flex-col gap-4 py-2 p-2 rounded-md bg-[#1f2640]">
              <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2 mb-2">
                <User size={20} /> Profile Information
              </h3>
              {loadingProfile ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-4 border-blue-500 border-opacity-75" role="status">
                    <span className="sr-only">Loading profile...</span>
                  </div>
                  <p className="ml-4 text-gray-300">Loading profile...</p>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  {profileMessage && (
                    <p className={`text-sm ${profileMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'} mt-2`}>
                      {profileMessage}
                    </p>
                  )}
                  {/* Display Username */}
                  <div className="text-left">
                    <label htmlFor="username" className="text-gray-400 block mb-1 text-sm">Username</label>
                    <input
                      type="text"
                      id="username"
                      value={username || ''}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full p-3 bg-[#2a304e] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                      {username === null && (
                           <p className="text-xs text-red-400 mt-1">Please set a unique username.</p>
                       )}
                  </div>
                  <div className="text-left">
                    <label htmlFor="email" className="text-gray-400 block mb-1 text-sm">Email</label>
                    <div className="w-full p-3 bg-[#0A0B1A] text-gray-300 border border-[#2a304e] rounded-md cursor-not-allowed">
                      {email}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">To change your email, use the "Email Preferences" option.</p>
                  </div>
                  <div className="text-left">
                    <label htmlFor="fullName" className="text-gray-400 block mb-1 text-sm">Full Name</label>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full p-3 bg-[#2a304e] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* NEW: Personality Profile Fields */}
                  <div className="text-left">
                    <label htmlFor="learning_style" className="text-gray-400 block mb-1 text-sm">Learning Style</label>
                    <input
                      type="text"
                      id="learning_style"
                      value={learningStyle}
                      onChange={(e) => setLearningStyle(e.target.value)}
                      placeholder="e.g., visual, auditory, kinesthetic, reading"
                      className="w-full p-3 bg-[#2a304e] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="text-left">
                    <label htmlFor="communication_preference" className="text-gray-400 block mb-1 text-sm">Communication Preference</label>
                    <input
                      type="text"
                      id="communication_preference"
                      value={communicationPreference}
                      onChange={(e) => setCommunicationPreference(e.target.value)}
                      placeholder="e.g., direct, exploratory, conceptual"
                      className="w-full p-3 bg-[#2a304e] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="text-left">
                    <label htmlFor="feedback_preference" className="text-gray-400 block mb-1 text-sm">Feedback Preference</label>
                    <input
                      type="text"
                      id="feedback_preference"
                      value={feedbackPreference}
                      onChange={(e) => setFeedbackPreference(e.target.value)}
                      placeholder="e.g., encouraging, challenging, constructive"
                      className="w-full p-3 bg-[#2a304e] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingProfile || !username}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 flex items-center justify-center"
                  >
                    {loadingProfile ? 'Saving...' : 'Save Changes'}
                    <Save size={16} className="inline-block ml-2" />
                  </button>
                </form>
              )}
            </div>

            {/* Existing Change Password and Email Preferences links */}
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300">Change Password</span>
              <button
                className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-white text-sm"
                onClick={() => router.push('/change-password')}
              >
                Manage
              </button>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300">Email Preferences</span>
              <button
                className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-white text-sm"
                onClick={() => router.push('/email-preferences')}
              >
                Manage
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="border-b border-[#2a304e] pb-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Lock size={20} /> Privacy & Security
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300">Delete Chat History</span>
              <button
                className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 transition-colors text-white text-sm disabled:opacity-50"
                onClick={handleDeleteChatHistory}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
                <Trash2 size={16} className="inline-block ml-2" />
              </button>
            </div>
            {deleteMessage && (
              <p className={`text-sm ${deleteMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'} mt-2`}>
                {deleteMessage}
              </p>
            )}
          </div>
        </div>

        {/* Notifications (Placeholder) */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bell size={20} /> Notifications
          </h2>
          <p className="text-gray-400 text-sm">Notification settings will be available soon.</p>
        </div>
      </section>
    </main>
  );
}