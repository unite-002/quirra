// src/app/change-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase'; // Your Supabase client
import { ArrowLeft, Lock } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match!');
      setLoading(false);
      return;
    }

    try {
      // Use updateUser to change the password for the currently logged-in user
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password change error:', error.message);
        setMessage(`Failed to change password: ${error.message}`);
      } else {
        setMessage('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        // Optionally redirect back to settings or a success page after a delay
        setTimeout(() => router.push('/settings'), 2000);
      }
    } catch (err) {
      console.error('Unexpected error during password change:', err);
      setMessage('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0B1A] p-4">
      <div className="bg-[#1a213a] rounded-lg shadow-xl p-8 max-w-md w-full text-center border border-[#2a304e]">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-full hover:bg-[#2a304e] transition-colors text-gray-400 hover:text-white"
            aria-label="Go back to settings"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-white flex-grow">Change Password</h2>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        {message && (
          <p className={`mb-4 ${message.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 bg-[#2a304e] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6} // Supabase default minimum password length
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-[#2a304e] text-white border border-[#3b4168] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
            <Lock size={16} className="inline-block ml-2" />
          </button>
        </form>
      </div>
    </div>
  );
}