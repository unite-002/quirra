"use client"

import { motion } from "framer-motion"

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#040417] via-[#0a0f2e] to-[#050F26] text-white px-6 py-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-extrabold text-center text-blue-400 mb-10"
        >
          Terms of Service
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg md:text-xl text-gray-300 text-center mb-12"
        >
          Please read these terms carefully before using QuirraAI’s services.
        </motion.p>

        <div className="space-y-10">
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="bg-[#111729] p-6 rounded-2xl shadow-md"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-4">1. Introduction</h2>
            <p className="text-gray-300">
              Welcome to QuirraAI! These Terms of Service govern your use of our platform. By accessing or using QuirraAI’s services, you agree to these terms. If you do not agree, you should not use our services.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="bg-[#111729] p-6 rounded-2xl shadow-md"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-4">2. Privacy Policy</h2>
            <p className="text-gray-300">
              At QuirraAI, privacy is our priority. We do not sell your personal data. All information is securely stored and processed, and you have control over what data Quirra remembers. Please review our Privacy Policy to understand our practices.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="bg-[#111729] p-6 rounded-2xl shadow-md"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-4">3. User Responsibilities</h2>
            <p className="text-gray-300">
              You are responsible for your account and must provide accurate information. You must not misuse the platform or violate any laws through QuirraAI. Any misuse may lead to termination of access.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="bg-[#111729] p-6 rounded-2xl shadow-md"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-4">4. Usage Rules</h2>
            <p className="text-gray-300">
              You agree not to use QuirraAI for illegal activities, and not to engage in abusive or harmful behavior towards others. Respect the platform and its users. QuirraAI may suspend or terminate accounts violating these rules.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="bg-[#111729] p-6 rounded-2xl shadow-md"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-4">5. Payment and Subscription</h2>
            <p className="text-gray-300">
              Some features of QuirraAI require a subscription. Payment for these services must be made through the provided channels. You agree to the payment terms upon subscribing.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="bg-[#111729] p-6 rounded-2xl shadow-md"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-4">6. Termination</h2>
            <p className="text-gray-300">
              We may terminate or suspend your access to QuirraAI if you violate these Terms or if we need to do so for operational or legal reasons. You may also terminate your account at any time.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.6 }}
            className="bg-[#111729] p-6 rounded-2xl shadow-md"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-4">7. Disclaimers and Limitations</h2>
            <p className="text-gray-300">
              QuirraAI is provided “as is” without warranties of any kind. We are not liable for any damages resulting from the use of the platform. You use QuirraAI at your own risk.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0, duration: 0.6 }}
            className="bg-[#111729] p-6 rounded-2xl shadow-md"
          >
            <h2 className="text-2xl font-semibold text-blue-400 mb-4">8. Changes to Terms</h2>
            <p className="text-gray-300">
              We may update these terms from time to time. We’ll notify you about any major changes, and it’s your responsibility to review the updated Terms.
            </p>
          </motion.section>
        </div>
      </div>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto py-10 text-center">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-3xl font-bold text-blue-400 mb-6"
        >
          Ready to experience the future of personal AI?
        </motion.h3>
        <a href="/sign-up">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-semibold text-lg">
            Get Started with Quirra
          </button>
        </a>
      </section>
    </main>
  )
}
