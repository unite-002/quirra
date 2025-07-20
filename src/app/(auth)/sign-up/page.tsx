// src/app/sign-up/page.tsx
'use client'

import { useState } from 'react' // This import might not be strictly needed for this specific page if not used, but is harmless.
import { useRouter } from 'next/navigation' // This import might not be strictly needed for this specific page if not used, but is harmless.
import AuthForm from '@/components/auth/AuthForm' // Ensure this path is correct

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#040417] text-white">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-blue-500">Ready to meet your AI ally?</h1>
        <p className="text-gray-400">Create your Quirra account — where intelligence meets emotional support.</p>
      </div>
      <AuthForm mode="sign-up" /> {/* This is the key component for your sign-up form */}
      <div className="mt-4 text-sm text-gray-400 text-center">
        Already have an account?{' '}
        <a href="/sign-in" className="text-blue-500 hover:underline">
          Sign in
        </a>
      </div>
      <div className="mt-2 text-sm text-gray-400 text-center">
        <a href="/terms" className="text-blue-500 hover:underline">Terms of Service</a> |{' '}
        <a href="/privacy-policy" className="text-blue-500 hover:underline">Privacy Policy</a>
      </div>
      <p className="mt-8 text-xs text-center text-gray-500">
        Quirra is built for minds like yours — thinkers, builders, dreamers.
      </p>
    </div>
  )
}