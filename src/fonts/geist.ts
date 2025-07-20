import localFont from 'next/font/local'

// Geist Sans (Regular & Medium)
const geistSans = localFont({
  src: [
    {
      path: './Geist-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './Geist-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-geist-sans',
  preload: true,
})

// Geist Mono (Regular)
const geistMono = localFont({
  src: [
    {
      path: './GeistMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-geist-mono',
  preload: true,
})

// Export both for usage in layouts, components, etc.
export const geist = {
  sans: geistSans,
  mono: geistMono,
}
