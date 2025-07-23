'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#040417] text-white font-sans">
      {/* Header */}
      <header className="flex justify-end items-center p-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex space-x-4"
        >
          <Link
            href="/sign-in"
            className="px-5 py-2 border border-white rounded-xl hover:bg-white hover:text-[#040417] transition"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-5 py-2 bg-white text-[#040417] font-medium rounded-xl hover:bg-opacity-80 transition"
          >
            Sign Up
          </Link>
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="text-center px-6 md:px-20 pt-12 pb-24">
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-extrabold bg-gradient-to-br from-white to-gray-400 text-transparent bg-clip-text drop-shadow-[0_3px_10px_rgba(255,255,255,0.25)]"
        >
          QuirraAI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg md:text-xl mt-6 max-w-3xl mx-auto text-gray-300"
        >
          Your deeply personal, emotionally intelligent AI — built to mentor, support, and evolve with you. Private, ethical, and designed for lifelong growth.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-10 flex justify-center gap-4"
        >
          <Link
            href="/sign-up"
            className="px-6 py-3 bg-white text-[#040417] font-semibold rounded-xl hover:bg-opacity-90 transition text-lg shadow text-center"
          >
            Get Started
          </Link>
          <Link
            href="/learn-more"
            className="px-6 py-3 border border-white text-white rounded-xl hover:bg-white hover:text-[#040417] transition text-lg text-center"
          >
            Learn More
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="grid gap-10 px-6 md:px-20 pb-28 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2, duration: 0.6 }}
            className="bg-[#070a1a] rounded-2xl p-6 shadow-md border border-[#12152a] hover:shadow-lg hover:border-white transition duration-300"
          >
            <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-500 border-t border-[#12152a]">
        © {new Date().getFullYear()} QuirraAI. All rights reserved.
      </footer>
    </main>
  );
}

const features = [
  {
    title: 'Deep Memory & Personality Modeling',
    description:
      'Quirra continuously learns from your interactions, adapting to your mindset, learning style, emotional states, and ambitions for deeply tailored support.',
  },
  {
    title: 'Emotionally Intelligent Conversations',
    description:
      'Responds not only to what you say — but how you feel. Designed to uplift, support, and engage with empathy in every context.',
  },
  {
    title: 'Built-in Motivation & Mentorship Engine',
    description:
      'Turns your goals into a guided path — helping you break habits, build momentum, and stay accountable based on how you think.',
  },
  {
    title: 'Cross-Domain Intelligence',
    description:
      'Connects knowledge across education, business, research, and life planning — all in one unified, deeply integrated AI assistant.',
  },
  {
    title: 'Privacy-First by Design',
    description:
      'No tracking. No profiling. All data is local or encrypted. Quirra is built ethically — to protect you and your growth, not exploit it.',
  },
  {
    title: 'Real-Time Adaptive Coaching',
    description:
      'Quirra adjusts in real-time to your mood, focus, and progress — offering just-in-time motivation, personalized learning, and support exactly when you need it.',
  },
];
