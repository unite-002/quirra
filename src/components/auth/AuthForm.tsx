// src/components/auth/AuthForm.tsx (UPDATED for sign-in redirect)
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PasswordInput from './PasswordInput'
import { motion } from 'framer-motion'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AuthForm({ mode }: { mode: 'sign-up' | 'sign-in' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!email || !password || (mode === 'sign-up' && !confirm)) {
      setErrorMessage('Please fill in all required fields.')
      setLoading(false)
      return
    }

    if (mode === 'sign-up' && password !== confirm) {
      setErrorMessage("Passwords don't match.")
      setLoading(false)
      return
    }

    try {
      if (mode === 'sign-up') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          setErrorMessage(error.message)
        } else {
          setSuccessMessage('Check your email to confirm your sign-up.')
        }
      } else {
        // Sign-in logic
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setErrorMessage(error.message)
        } else if (data.user) {
          console.log('AuthForm: Successfully signed in. Attempting to redirect to /chat.'); // Added console log for debugging
          router.push('/chat') // <--- CHANGED FROM '/' TO '/chat'
        }
      }
    } catch (error: any) {
      setErrorMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="space-y-4 w-full max-w-md"
    >
      {errorMessage && (
        <div className="text-red-500 text-sm bg-red-800/20 p-2 rounded-xl">{errorMessage}</div>
      )}
      {successMessage && (
        <div className="text-green-400 text-sm bg-green-900/20 p-2 rounded-xl">{successMessage}</div>
      )}

      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 rounded-2xl bg-[#0a0a24] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <PasswordInput
        name="password"
        placeholder="Password (min 8 chars)"
        value={password}
        onChange={(e: any) => setPassword(e.target.value)}
      />
      {mode === 'sign-up' && (
        <PasswordInput
          name="confirm"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e: any) => setConfirm(e.target.value)}
        />
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-2xl text-white bg-gradient-to-br from-blue-700 to-blue-900 hover:opacity-90 transition font-bold text-lg"
      >
        {loading ? 'Please wait...' : mode === 'sign-up' ? 'Join Quirra →' : 'Sign In →'}
      </button>
    </motion.form>
  )
}