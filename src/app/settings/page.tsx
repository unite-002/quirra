// src/app/settings/page.tsx (REDESIGNED)
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, User, Lock, Trash2, Bell, Mail, Save, Settings } from "lucide-react"; // Added Settings icon
import { supabase } from "@/utils/supabase";
import { useState, useEffect } from "react";

// Define an interface for the profile data you expect to fetch
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

  // No longer directly setting these states from inputs on *this* page,
  // but keeping them for initial fetch and potential display if needed elsewhere.
  const [learningStyle, setLearningStyle] = useState<string>('');
  const [communicationPreference, setCommunicationPreference] = useState<string>('');
  const [feedbackPreference, setFeedbackPreference] = useState<string>('');

  // State for delete chat history
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  // --- Profile Loading Logic ---
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
          .select('username, full_name, learning_style, communication_preference, feedback_preference')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means "no rows found"
          console.error('Error fetching user profile:', profileError.message);
          setProfileMessage(`Error loading profile details: ${profileError.message}`);
        } else if (profile) {
          // If profile exists, set relevant state variables
          setUsername(profile.username);
          setFullName(profile.full_name || '');
          // These are fetched but no longer directly editable on this page
          setLearningStyle(profile.learning_style || '');
          setCommunicationPreference(profile.communication_preference || '');
          setFeedbackPreference(profile.feedback_preference || '');
        } else {
          // If no profile found, but user exists, pre-fill full_name from user_metadata if available
          setFullName(user.user_metadata?.full_name || '');
          setUsername(null); // Explicitly set username to null if not found in profiles
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

  // Handle profile update logic (only for username and full_name on this page)
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

      // Prepare the profile data to be upserted (only username and full_name from this page)
      const profileDataToSave = {
        id: user.id,
        username: username, // Ensure username is not null here, add validation if needed
        full_name: fullName.trim() || null,
        // Removed learning_style, communication_preference, feedback_preference from here
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
    <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col items-center py-8 px-4 font-sans">
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
      <section className="w-full max-w-2xl bg-[#1a213a] rounded-xl shadow-2xl border border-[#2a304e] p-8 space-y-8">
        {/* Account Settings */}
        <div className="border-b border-[#2a304e] pb-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 text-blue-400">
            <User size={24} /> Account
          </h2>
          <div className="space-y-6">
            {/* Profile Information Form */}
            <div className="flex flex-col gap-5 py-4 px-5 rounded-lg bg-[#0A0B1A] border border-[#2a304e]">
              <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                Your Profile
              </h3>
              {loadingProfile ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-4 border-blue-500 border-opacity-75" role="status">
                    <span className="sr-only">Loading profile...</span>
                  </div>
                  <p className="ml-4 text-gray-300 text-lg">Loading profile...</p>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  {profileMessage && (
                    <p className={`text-sm ${profileMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'} mt-2 p-2 rounded bg-[#2a304e]`}>
                      {profileMessage}
                    </p>
                  )}
                  {/* Display Username */}
                  <div className="text-left">
                    <label htmlFor="username" className="text-gray-300 block mb-2 text-sm font-medium">Username</label>
                    <input
                      type="text"
                      id="username"
                      value={username || ''}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full p-3 bg-[#1a213a] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      required
                    />
                    {username === null && (
                      <p className="text-xs text-red-400 mt-1">Please set a unique username to personalize your experience.</p>
                    )}
                  </div>
                  <div className="text-left">
                    <label htmlFor="email" className="text-gray-300 block mb-2 text-sm font-medium">Email Address</label>
                    <div className="w-full p-3 bg-[#0a0b1a] text-gray-400 border border-[#2a304e] rounded-md cursor-not-allowed text-base">
                      {email}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Your email is read-only here. Use "Email Preferences" to change it.</p>
                  </div>
                  <div className="text-left">
                    <label htmlFor="fullName" className="text-gray-300 block mb-2 text-sm font-medium">Full Name</label>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full p-3 bg-[#1a213a] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>

                  {/* Removed Personality Profile Fields from this form */}

                  <button
                    type="submit"
                    disabled={loadingProfile || !username}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingProfile ? 'Saving Changes...' : 'Save Profile'}
                    <Save size={20} />
                  </button>
                </form>
              )}
            </div>

            {/* Existing Change Password and Email Preferences links */}
            <div className="flex justify-between items-center py-3 border-t border-[#2a304e] pt-6">
              <span className="text-gray-200 text-lg font-medium flex items-center gap-2">
                <Lock size={20} className="text-gray-400" /> Change Password
              </span>
              <button
                className="px-5 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-white text-base font-medium"
                onClick={() => router.push('/change-password')}
              >
                Manage
              </button>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-200 text-lg font-medium flex items-center gap-2">
                <Mail size={20} className="text-gray-400" /> Email Preferences
              </span>
              <button
                className="px-5 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-white text-base font-medium"
                onClick={() => router.push('/email-preferences')}
              >
                Manage
              </button>
            </div>

            {/* NEW: Personal Preferences Button */}
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-200 text-lg font-medium flex items-center gap-2">
                <Settings size={20} className="text-gray-400" /> Personal Preferences
              </span>
              <button
                className="px-5 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-white text-base font-medium"
                onClick={() => router.push('/personal-preferences')}
              >
                Manage
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="border-b border-[#2a304e] pb-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 text-red-400">
            <Lock size={24} /> Privacy & Security
          </h2>
          <div className="space-y-6">
            <div className="flex justify-between items-center py-3 rounded-lg bg-[#0A0B1A] border border-[#2a304e] px-5">
              <span className="text-gray-200 text-lg font-medium flex items-center gap-2">
                <Trash2 size={20} className="text-gray-400" /> Delete Chat History
              </span>
              <button
                className="px-5 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-white text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={handleDeleteChatHistory}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete All'}
                <Trash2 size={20} />
              </button>
            </div>
            {deleteMessage && (
              <p className={`text-sm ${deleteMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'} mt-2 p-2 rounded bg-[#2a304e]`}>
                {deleteMessage}
              </p>
            )}
          </div>
        </div>

        {/* Notifications (Placeholder) */}
        <div>
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 text-yellow-400">
            <Bell size={24} /> Notifications
          </h2>
          <div className="p-5 rounded-lg bg-[#0A0B1A] border border-[#2a304e]">
            <p className="text-gray-400 text-base">Notification settings will be available soon. Check back for updates!</p>
          </div>
        </div>
      </section>
    </main>
  );
}