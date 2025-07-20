import localFont from 'next/font/local'

export const geist = localFont({
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
    {
      path: './GeistMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-geist',
  display: 'swap',
  preload: true,
})
