import React from 'react';

// ARIA roles are added for accessibility
const SkeletonLoader = ({ type }: { type: 'sidebar' | 'chat' }) => {
  if (type === 'sidebar') {
    return (
      <div className="p-2 space-y-3" role="status" aria-label="Loading recent chats...">
        <div className="h-6 bg-gray-700 rounded-md animate-pulse w-full"></div>
        <div className="h-6 bg-gray-700 rounded-md animate-pulse w-5/6"></div>
        <div className="h-6 bg-gray-700 rounded-md animate-pulse w-4/5"></div>
        <div className="h-6 bg-gray-700 rounded-md animate-pulse w-3/4"></div>
      </div>
    );
  }

  if (type === 'chat') {
    return (
      <div className="space-y-4" role="status" aria-label="Loading chat messages...">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded-md animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded-md animate-pulse w-1/2"></div>
          </div>
        </div>
        <div className="flex items-start space-x-3 flex-row-reverse">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 animate-pulse"></div>
          <div className="flex-1 space-y-2 text-right">
            <div className="h-4 bg-blue-600 rounded-md animate-pulse w-2/3 ml-auto"></div>
            <div className="h-4 bg-blue-600 rounded-md animate-pulse w-1/2 ml-auto"></div>
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded-md animate-pulse w-full"></div>
            <div className="h-4 bg-gray-700 rounded-md animate-pulse w-4/5"></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SkeletonLoader;