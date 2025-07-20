// src/app/layout.tsx
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Load Geist Sans (Regular + Medium)
const geistSans = localFont({
  src: [
    {
      path: '../fonts/Geist-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/Geist-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--font-geist-sans',
  display: 'swap',
})

// Load Geist Mono (Regular)
const geistMono = localFont({
  src: [
    {
      path: '../fonts/GeistMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-geist-mono',
  display: 'swap',
})

// App Metadata
export const metadata: Metadata = {
  title: 'Quirra — Next-Gen AI Assistant',
  description:
    'Quirra is a future-ready, multilingual AI assistant built for reasoning, memory, and emotional intelligence.',
  icons: {
    icon: '/favicon.ico',
  },
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-black text-white antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
