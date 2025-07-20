'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function SignOutPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('SignOutPage: useEffect triggered.');

    const performSignOut = async () => {
      setSigningOut(true);
      setError(null);

      try {
        console.log('SignOutPage: Attempting to sign out...');
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
          console.error('SignOutPage: Supabase sign out error:', signOutError.message);
          setError('Failed to sign out. Please try again.');
          setSigningOut(false);
        } else {
          console.log('SignOutPage: Supabase sign out successful!');
          setTimeout(() => {
            console.log('SignOutPage: Redirecting to /sign-in...'); // CHANGED FROM /login
            router.push('/sign-in'); // CHANGED FROM /login
          }, 1500);
        }
      } catch (err) {
        console.error('SignOutPage: Unexpected error during sign out:', err);
        setError('An unexpected error occurred. Please try again.');
        setSigningOut(false);
      }
    };

    performSignOut();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0B1A] p-4">
      <div className="bg-[#1a213a] rounded-lg shadow-xl p-8 max-w-md w-full text-center border border-[#2a304e]">
        {signingOut ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-4 border-blue-500 border-opacity-75 mx-auto mb-4" role="status" aria-label="Loading">
              <span className="sr-only">Signing out...</span>
            </div>
            <p className="text-xl font-semibold text-white">Signing you out...</p>
            <p className="text-gray-300 mt-2">Please wait a moment while we securely log you out.</p>
          </>
        ) : error ? (
          <>
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2A9 9 0 111 12a9 9 0 0118 0z"></path>
            </svg>
            <h2 className="text-xl font-semibold text-red-400 mt-4">Sign Out Failed</h2>
            <p className="text-red-300 mt-2">{error}</p>
            <button
              onClick={() => {
                console.log('SignOutPage: "Go Back to Quirra" button clicked, redirecting to /');
                router.push('/');
              }}
              className="mt-6 px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Go Back to Quirra
            </button>
          </>
        ) : (
          <>
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 className="text-xl font-semibold text-green-400 mt-4">Signed Out Successfully!</h2>
            <p className="text-gray-300 mt-2">You are being redirected to the sign-in page.</p>
          </>
        )}
      </div>
    </div>
  );
}