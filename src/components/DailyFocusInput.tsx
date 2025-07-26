// src/components/DailyFocusInput.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseSession, supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';
import { Check, XCircle } from 'lucide-react'; // Added Check and XCircle for potential use in UI feedback

// Define the interface for the daily focus data returned from Supabase
interface DailyFocus {
  focus_text: string;
  created_at: string;
  date: string; // The date component of the focus
  user_id: string;
}

const DailyFocusInput: React.FC = () => {
  const { session, loading } = useSupabaseSession();
  const [focus, setFocus] = useState<string>('');
  const [currentFocus, setCurrentFocus] = useState<DailyFocus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false); // For "Saved!" checkmark

  // Function to fetch the current daily focus
  const fetchDailyFocus = useCallback(async (user: User) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_focus')
        .select('focus_text, created_at, date, user_id')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFocus(data.focus_text || '');
        setCurrentFocus(data);
      } else {
        setFocus('');
        setCurrentFocus(null);
      }
    } catch (err: any) {
      console.error('Error fetching daily focus:', err.message);
      setError('Failed to fetch daily focus.');
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback with empty dependency array because user is passed as argument

  useEffect(() => {
    if (session?.user && !loading) {
      fetchDailyFocus(session.user);
    }
  }, [session, loading, fetchDailyFocus]); // Add fetchDailyFocus to dependencies

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setError('You must be logged in to set your daily focus.');
      return;
    }
    if (focus.trim() === '') {
      setError('Daily focus cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);
    setShowConfirmation(false);

    try {
      const response = await fetch('/api/set-daily-focus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ focusText: focus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to set daily focus.');
      }

      setMessage(result.message);
      setShowConfirmation(true); // Show checkmark
      setTimeout(() => setShowConfirmation(false), 2000); // Hide after 2 seconds

      if (session.user) {
         fetchDailyFocus(session.user); // Re-fetch to update current focus and ensure consistency
      }

    } catch (err: any) {
      console.error('Error setting daily focus:', err.message);
      setError(err.message || 'An error occurred while setting daily focus.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-400">Loading focus...</p>;
  }

  if (!session) {
    return <p className="text-center text-red-400">Please log in to set your daily focus.</p>;
  }

  return (
    <div className="daily-focus-container p-4 bg-[#1a213a] rounded-lg shadow-md max-w-md mx-auto my-4 border border-[#2a304e]">
      <h2 className="text-xl font-semibold mb-4 text-center text-white">Set Your Daily Focus</h2>
      {error && (
        <p className="text-red-400 mb-2 text-center text-sm flex items-center justify-center gap-1">
          <XCircle size={16} /> {error}
        </p>
      )}
      {message && (
        <p className="text-green-400 mb-2 text-center text-sm flex items-center justify-center gap-1">
          {showConfirmation ? <Check size={16} /> : null} {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {currentFocus && (
          <p className="text-sm text-gray-300 bg-[#0A0B1A] p-2 rounded-md border border-[#2a304e] flex items-center justify-between">
            <span>
              **Current Focus for Today:** "
              <span className="font-medium text-blue-400">{currentFocus.focus_text}</span>"
            </span>
            {/* Optional: Clear focus button if needed, but upsert handles updates */}
          </p>
        )}
        <textarea
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="What is your main focus or goal for today?"
          rows={3}
          className="w-full p-2 border border-[#2a304e] rounded-md bg-[#0A0B1A] text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500 resize-y"
          disabled={isLoading}
          aria-label="Daily focus input"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition duration-150 ease-in-out"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : currentFocus ? 'Update Focus' : 'Set Focus'}
        </button>
      </form>
    </div>
  );
};

export default DailyFocusInput;