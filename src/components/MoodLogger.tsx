// src/components/MoodLogger.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseSession, supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';
import { Check, XCircle, Smile, Frown, Meh, Laugh, Angry, Cloud } from 'lucide-react'; // Icons for moods

// Define the interface for the mood log data returned from Supabase
interface MoodLog {
  mood_label: string;
  sentiment_score: number;
  timestamp: string;
  date: string; // The date component of the mood log
  user_id: string;
}

// Define the mood options with their labels and corresponding sentiment scores
const moodOptions = [
  { label: 'Happy', value: 'happy', score: 0.8, icon: Laugh },
  { label: 'Neutral', value: 'neutral', score: 0.1, icon: Meh },
  { label: 'Sad', value: 'sad', score: -0.6, icon: Frown },
  { label: 'Excited', value: 'excited', score: 0.9, icon: Smile },
  { label: 'Anxious', value: 'anxious', score: -0.4, icon: Cloud }, // Using Cloud for anxious/overwhelmed
  { label: 'Angry', value: 'angry', score: -0.8, icon: Angry },
];

const MoodLogger: React.FC = () => {
  const { session, loading } = useSupabaseSession();
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [currentMoodLog, setCurrentMoodLog] = useState<MoodLog | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  // Function to fetch the current mood log for today
  const fetchCurrentMood = useCallback(async (user: User) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('mood_logs')
        .select('mood_label, sentiment_score, timestamp, date, user_id')
        .eq('user_id', user.id)
        .eq('date', today) // Fetch for today's date
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is okay
        throw error;
      }

      if (data) {
        setSelectedMood(data.mood_label || '');
        setCurrentMoodLog(data);
      } else {
        setSelectedMood('');
        setCurrentMoodLog(null);
      }
    } catch (err: any) {
      console.error('Error fetching current mood:', err.message);
      setError('Failed to fetch current mood.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user && !loading) {
      fetchCurrentMood(session.user);
    }
  }, [session, loading, fetchCurrentMood]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setError('You must be logged in to log your mood.');
      return;
    }
    if (!selectedMood) {
      setError('Please select a mood.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);
    setShowConfirmation(false);

    const moodOption = moodOptions.find(option => option.value === selectedMood);
    if (!moodOption) {
      setError('Invalid mood selected.');
      setIsLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('mood_logs')
        .upsert({
          user_id: session.user.id,
          date: today,
          mood_label: moodOption.value,
          sentiment_score: moodOption.score,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setMessage('Mood logged successfully!');
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);

      if (session.user) {
         setCurrentMoodLog(data as MoodLog); // Update the state with the new data
      }

    } catch (err: any) {
      console.error('Error logging mood:', err.message);
      setError(err.message || 'An error occurred while logging mood.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-400">Loading mood logger...</p>;
  }

  if (!session) {
    return <p className="text-center text-red-400">Please log in to log your mood.</p>;
  }

  return (
    <div className="mood-logger-container p-4 bg-[#1a213a] rounded-lg shadow-md max-w-md mx-auto my-4 border border-[#2a304e]">
      <h2 className="text-xl font-semibold mb-4 text-center text-white">How are you feeling today?</h2>
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
        {currentMoodLog && (
          <p className="text-sm text-gray-300 bg-[#0A0B1A] p-2 rounded-md border border-[#2a304e]">
            **Your current mood for today:** "
            <span className="font-medium text-blue-400 capitalize">{currentMoodLog.mood_label}</span>" (Score: {currentMoodLog.sentiment_score.toFixed(2)})
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          {moodOptions.map((mood) => {
            const IconComponent = mood.icon;
            return (
              <button
                key={mood.value}
                type="button"
                onClick={() => setSelectedMood(mood.value)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200
                  ${selectedMood === mood.value
                    ? 'bg-blue-600 border-blue-700 text-white shadow-lg scale-105'
                    : 'bg-[#0A0B1A] border-[#2a304e] text-gray-300 hover:bg-[#2a304e] hover:text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={isLoading}
                aria-pressed={selectedMood === mood.value}
              >
                <IconComponent size={24} className="mb-1" />
                <span className="text-xs font-medium">{mood.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition duration-150 ease-in-out"
          disabled={isLoading || !selectedMood}
        >
          {isLoading ? 'Saving...' : currentMoodLog ? 'Update Mood' : 'Log Mood'}
        </button>
      </form>
    </div>
  );
};

export default MoodLogger;