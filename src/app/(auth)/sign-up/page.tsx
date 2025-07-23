// app/(auth)/sign-up/page.tsx
'use client';

import AuthForm from '@/components/auth/AuthForm';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#040417] text-white font-sans overflow-hidden relative">
      {/* Optional: Subtle background gradient/texture for depth */}
      <div className="absolute inset-0 z-0 opacity-10" style={{
        background: 'radial-gradient(circle at top, rgba(13, 17, 43, 0.8) 0%, transparent 70%)'
      }}></div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md mx-auto py-8">
        {/* Hero Section - Elevated and refined */}
        <div className="text-center space-y-3 mb-8 px-4">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            // Adjusted text size for potentially staying on one line on most devices
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-br from-white to-gray-300 text-transparent bg-clip-text drop-shadow-[0_3px_10px_rgba(255,255,255,0.2)] whitespace-nowrap overflow-hidden text-ellipsis"
          >
            Welcome to Quirra.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-base md:text-lg text-gray-300 max-w-prose mx-auto"
          >
            Your AI companion for growth and discovery.
          </motion.p>
        </div>

        {/* Auth Form Component */}
        <AuthForm mode="sign-up" />

        {/* Links below the form */}
        <div className="mt-6 text-sm text-gray-400 text-center space-y-2">
          <p>
            Already have an account?{' '}
            <Link
              href="/sign-in"
              className="text-blue-500 hover:underline transition-colors duration-200"
            >
              Sign In
            </Link>
          </p>
          <p>
            By creating an account, you agree to our{' '}
            <Link
              href="/terms"
              className="text-blue-500 hover:underline transition-colors duration-200"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="text-blue-500 hover:underline transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Footer Text - Only copyright remains */}
        <p className="mt-10 text-xs text-center text-gray-500">
            &copy; {new Date().getFullYear()} QuirraAI. All rights reserved.
        </p>
      </div>
    </main>
  );
}