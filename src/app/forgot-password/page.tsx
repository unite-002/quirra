"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with Supabase reset password logic
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#040417] to-[#050F26] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center space-y-2 mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-3xl md:text-4xl font-bold"
        >
          Forgot Your Password?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-gray-400"
        >
          No worries! We'll help you reset it.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4 }}
        className="max-w-md w-full bg-[#0d112d] rounded-2xl p-6 shadow-lg"
      >
        {!submitted ? (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1c1f3a] border border-[#2c2f54] focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <button
              type="submit"
              disabled={submitted}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
            >
              {submitted ? "Check your inbox!" : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <p className="text-center text-green-400">
            ✅ If your email exists, a reset link has been sent.
          </p>
        )}
      </motion.div>

      <div className="mt-4 text-sm text-gray-400 text-center">
        <p>
          Remembered your password?{" "}
          <a href="/sign-in" className="text-blue-500 hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
}
