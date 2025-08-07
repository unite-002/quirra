// components/DailySnapshotDisplay.tsx
import React from 'react';
import { Target, Smile } from 'lucide-react';

interface DailySnapshotDisplayProps {
  currentMoodLog: string | null; // Represents the logged mood for today
  currentFocus: string | null;   // Represents the daily focus for today
}

const DailySnapshotDisplay: React.FC<DailySnapshotDisplayProps> = ({ currentMoodLog, currentFocus }) => {
  return (
    <div className="bg-[#1a213a] p-5 rounded-xl shadow-lg border border-gray-700 mb-6 animate-fadeIn">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Your Day at a Glance
      </h3>
      <div className="space-y-3">
        {currentFocus ? (
          <div className="flex items-center gap-3 text-gray-300">
            <Target size={20} className="text-blue-400" />
            <p>
              **Daily Focus:** <span className="text-white font-semibold">{currentFocus}</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-500 italic">
            <Target size={20} />
            <p>No daily focus set yet.</p>
          </div>
        )}

        {currentMoodLog ? (
          <div className="flex items-center gap-3 text-gray-300">
            <Smile size={20} className="text-yellow-400" />
            <p>
              **Current Mood:** <span className="text-white font-semibold">{currentMoodLog}</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-500 italic">
            <Smile size={20} />
            <p>No mood logged for today.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailySnapshotDisplay;