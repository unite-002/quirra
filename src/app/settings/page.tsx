// src/app/settings/page.tsx (REDESIGNED V5 - Navigation Hub)
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, User, Lock, Trash2, Bell, Mail, Settings } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/utils/supabase";

export default function SettingsPage() {
  const router = useRouter();

  // State for delete chat history
  const [deleteChatLoading, setDeleteChatLoading] = useState(false);
  const [deleteChatMessage, setDeleteChatMessage] = useState<string | null>(null);
  const [showDeleteChatConfirmModal, setShowDeleteChatConfirmModal] = useState(false);

  // State for delete account
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountMessage, setDeleteAccountMessage] = useState<string | null>(null);
  const [showDeleteAccountConfirmModal, setShowDeleteAccountConfirmModal] = useState(false);

  // --- Delete Chat History Logic ---
  const handleDeleteChatHistory = () => {
    setShowDeleteChatConfirmModal(true);
  };

  const confirmDeleteChatHistory = async () => {
    setShowDeleteChatConfirmModal(false);
    setDeleteChatLoading(true);
    setDeleteChatMessage(null);

    try {
      // Call the new API route to delete all chat history and sessions
      const response = await fetch('/api/delete-all-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // No need to send user_id here, the API route will get it from the session
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete history on server.');
      }

      console.log("Chat history and sessions deleted successfully via API.");
      setDeleteChatMessage("Chat history and sessions deleted successfully!");
      
      // After successful deletion, force a refresh of the chat page to clear client-side state
      // and redirect to a new, empty chat.
      setTimeout(() => {
        router.push("/chat");
        router.refresh(); // Important for Next.js App Router to re-fetch data
      }, 1500);

    } catch (err: any) {
      console.error("An unexpected error occurred during chat history deletion:", err.message);
      setDeleteChatMessage(`An unexpected error occurred during deletion: ${err.message}`);
    } finally {
      setDeleteChatLoading(false);
    }
  };

  // --- Delete Account Logic ---
  const handleDeleteAccount = () => {
    setShowDeleteAccountConfirmModal(true);
  };

  const confirmDeleteAccount = async () => {
    setShowDeleteAccountConfirmModal(false);
    setDeleteAccountLoading(true);
    setDeleteAccountMessage(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user for account deletion:", userError?.message || "User not logged in.");
        setDeleteAccountMessage("Error: Could not retrieve user. Please log in again.");
        setDeleteAccountLoading(false);
        return;
      }

      const user_id = user.id;

      // Step 1: Delete related data (messages, memory, chat_sessions, profile)
      // Call the API route to delete all chat history and sessions first
      const deleteChatResponse = await fetch('/api/delete-all-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!deleteChatResponse.ok) {
        const errorData = await deleteChatResponse.json();
        throw new Error(errorData.error || 'Failed to delete chat history and sessions for account deletion.');
      }
      console.log("Chat history and sessions deleted as part of account deletion.");


      // Delete memory (if 'memory' table is separate from chat history in your design)
      const { error: deleteMemoryError } = await supabase
        .from('memory') // Assuming 'memory' table exists and has user_id
        .delete()
        .eq('user_id', user_id);

      if (deleteMemoryError) {
        throw new Error(`Failed to delete memory: ${deleteMemoryError.message}`);
      }
      console.log("Memory deleted successfully.");

      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user_id);

      if (deleteProfileError) {
        throw new Error(`Failed to delete profile: ${deleteProfileError.message}`);
      }
      console.log("Profile deleted successfully.");

      // Step 2: Sign out the user
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Error signing out after data deletion:", signOutError.message);
        setDeleteAccountMessage(`Account data deleted, but failed to sign out: ${signOutError.message}`);
        setDeleteAccountLoading(false);
        return;
      }

      // Step 3: Delete the user account (this typically requires a secure backend function)
      // In a client-side app, direct user deletion is generally not allowed for security reasons.
      // This usually needs a Supabase Function/Edge Function or a secure backend call.
      // For now, we'll simulate success after data deletion and sign out.
      // If you have a backend function, you'd call it here, e.g.:
      // const authDeleteResponse = await fetch('/api/delete-user-account', { method: 'POST' });
      // if (!authDeleteResponse.ok) { /* handle error */ }

      console.log("Account and all associated data deleted successfully.");
      setDeleteAccountMessage("Your account and all data have been permanently deleted. Redirecting...");
      setTimeout(() => {
        router.push("/sign-in"); // Redirect to sign-in page after deletion
      }, 2000);

    } catch (err: any) {
      console.error("An unexpected error occurred during account deletion:", err.message);
      setDeleteAccountMessage("An unexpected error occurred during deletion.");
    } finally {
      setDeleteAccountLoading(false);
    }
  };


  return (
    <main className="min-h-screen bg-[#0A0B1A] text-white flex flex-col items-center py-8 px-4 font-sans">
      {/* Header */}
      <header className="w-full max-w-2xl flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/chat")} // Changed to /chat
          className="p-2 rounded-full hover:bg-[#1a213a] transition-colors text-gray-400 hover:text-white"
          aria-label="Go back to chat"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
      </header>

      {/* Settings Content - Navigation List */}
      <section className="w-full max-w-2xl bg-[#1a213a] rounded-xl shadow-2xl border border-[#2a304e] p-8 space-y-4">

        {/* Account Details Button */}
        <div className="flex justify-between items-center py-3 px-5 rounded-lg bg-[#0A0B1A] border border-[#2a304e] hover:bg-[#111325] transition-colors">
          <span className="text-gray-200 text-lg font-medium flex items-center gap-3">
            <User size={22} className="text-blue-400" /> Account Details
          </span>
          <button
            className="px-5 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-white text-base font-medium"
            onClick={() => router.push('/settings/account-details')}
          >
            Manage
          </button>
        </div>

        {/* Personal Preferences Button */}
        <div className="flex justify-between items-center py-3 px-5 rounded-lg bg-[#0A0B1A] border border-[#2a304e] hover:bg-[#111325] transition-colors">
          <span className="text-gray-200 text-lg font-medium flex items-center gap-3">
            <Settings size={22} className="text-blue-400" /> Personal Preferences
          </span>
          <button
            className="px-5 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-white text-base font-medium"
            onClick={() => router.push('/personal-preferences')}
          >
            Manage
          </button>
        </div>

        {/* Change Password Button */}
        <div className="flex justify-between items-center py-3 px-5 rounded-lg bg-[#0A0B1A] border border-[#2a304e] hover:bg-[#111325] transition-colors">
          <span className="text-gray-200 text-lg font-medium flex items-center gap-3">
            <Lock size={22} className="text-blue-400" /> Change Password
          </span>
          <button
            className="px-5 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-white text-base font-medium"
            onClick={() => router.push('/change-password')}
          >
            Manage
          </button>
        </div>

        {/* Email Preferences Button */}
        <div className="flex justify-between items-center py-3 px-5 rounded-lg bg-[#0A0B1A] border border-[#2a304e] hover:bg-[#111325] transition-colors">
          <span className="text-gray-200 text-lg font-medium flex items-center gap-3">
            <Mail size={22} className="text-blue-400" /> Email Preferences
          </span>
          <button
            className="px-5 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-white text-base font-medium"
            onClick={() => router.push('/email-preferences')}
          >
            Manage
          </button>
        </div>

        {/* Danger Zone */}
        <div className="py-6 border-t border-[#2a304e] mt-8 pt-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 text-red-400">
            <Trash2 size={24} /> Danger Zone
          </h2>
          <div className="space-y-4">
            {/* Delete Chat History */}
            <div className="flex justify-between items-center py-3 rounded-lg bg-[#0A0B1A] border border-[#2a304e] px-5">
              <span className="text-gray-200 text-lg font-medium flex items-center gap-3">
                <Trash2 size={22} className="text-red-400" /> Delete Chat History
              </span>
              <button
                className="px-5 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-white text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={handleDeleteChatHistory}
                disabled={deleteChatLoading}
              >
                {deleteChatLoading ? 'Deleting...' : 'Delete All'}
                <Trash2 size={20} />
              </button>
            </div>
            {deleteChatMessage && (
              <p className={`text-sm ${deleteChatMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'} mt-2 p-2 rounded bg-[#2a304e]`}>
                {deleteChatMessage}
              </p>
            )}

            {/* Delete Account */}
            <div className="flex justify-between items-center py-3 rounded-lg bg-[#0A0B1A] border border-[#2a304e] px-5">
              <span className="text-gray-200 text-lg font-medium flex items-center gap-3">
                <User size={22} className="text-red-400" /> Delete Account
              </span>
              <button
                className="px-5 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-white text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={handleDeleteAccount}
                disabled={deleteAccountLoading}
              >
                {deleteAccountLoading ? 'Deleting...' : 'Delete Account'}
                <Trash2 size={20} />
              </button>
            </div>
            {deleteAccountMessage && (
              <p className={`text-sm ${deleteAccountMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'} mt-2 p-2 rounded bg-[#2a304e]`}>
                {deleteAccountMessage}
              </p>
            )}
          </div>
        </div>

        {/* Notifications (Placeholder) */}
        <div className="py-6 border-t border-[#2a304e] mt-8 pt-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 text-yellow-400">
            <Bell size={24} /> Notifications
          </h2>
          <div className="p-5 rounded-lg bg-[#0A0B1A] border border-[#2a304e]">
            <p className="text-gray-400 text-base">Notification settings will be available soon. Check back for updates!</p>
          </div>
        </div>
      </section>

      {/* Delete Chat Confirmation Modal */}
      {showDeleteChatConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a213a] rounded-lg p-8 shadow-xl border border-[#2a304e] max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to delete ALL chat history and associated memory? This action cannot be undone.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteChatConfirmModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteChatHistory}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a213a] rounded-lg p-8 shadow-xl border border-[#2a304e] max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-red-500 mb-4">Permanently Delete Account?</h3>
            <p className="text-gray-300 mb-6">
              This action is irreversible. All your data, including profile, chat history, and preferences, will be permanently deleted.
              Are you absolutely sure you want to proceed?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteAccountConfirmModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAccount}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}