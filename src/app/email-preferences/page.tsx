// src/app/email-preferences/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';
import { useState } from 'react'; // For potential future form state

export default function EmailPreferencesPage() {
  const router = useRouter();
  // Example state for preferences, replace with actual implementation
  const [newsletter, setNewsletter] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);

  // In a real app, you'd load preferences here and save them
  // const handleSavePreferences = () => {
  //   // Call API to save preferences to Supabase user metadata or a separate table
  //   alert('Preferences saved! (to be implemented)');
  //   router.push('/settings');
  // };

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
          <h2 className="text-2xl font-bold text-white flex-grow">Email Preferences</h2>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        <p className="text-gray-300 mb-6">Manage what emails you receive from Quirra.</p>

        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between py-2 border-b border-[#2a304e] last:border-b-0">
            <label htmlFor="newsletter" className="text-gray-300 cursor-pointer flex items-center gap-2">
              <Bell size={20} /> Newsletter
            </label>
            <input
              type="checkbox"
              id="newsletter"
              checked={newsletter}
              onChange={() => setNewsletter(!newsletter)}
              className="h-5 w-5 rounded form-checkbox text-blue-600 bg-[#2a304e] border-[#3b4168] focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#2a304e] last:border-b-0">
            <label htmlFor="productUpdates" className="text-gray-300 cursor-pointer flex items-center gap-2">
              <Bell size={20} /> Product Updates
            </label>
            <input
              type="checkbox"
              id="productUpdates"
              checked={productUpdates}
              onChange={() => setProductUpdates(!productUpdates)}
              className="h-5 w-5 rounded form-checkbox text-blue-600 bg-[#2a304e] border-[#3b4168] focus:ring-blue-500"
            />
          </div>

          {/* Add more preferences here */}
        </div>

        {/* This button would typically save changes, for now it's just a placeholder */}
        <button
          onClick={() => {
            alert('Preferences updated (functional logic to be implemented)');
            router.push('/settings');
          }}
          className="mt-8 w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}