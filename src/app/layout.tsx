// src/app/layout.tsx

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { geist } from '@/fonts/geist'

// App Metadata
export const metadata: Metadata = {
  title: 'Quirra — Next-Gen AI Assistant',
  description:
    'Quirra is a future-ready, multilingual AI assistant built for reasoning, memory, and emotional intelligence.',
  icons: {
    icon: '/favicon.ico',
  },
}

// Viewport & theme color
export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geist.sans.variable} ${geist.mono.variable}`}
    >
      <body className="bg-black text-white antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
