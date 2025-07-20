import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'quirra-deep': '#070b18',
        'quirra-blue': '#15204b',
        'quirra-soft': '#2b375f',
        'quirra-accent': '#4c7fff',
        'quirra-text': '#e0e7ff',
        'quirra-muted': '#8ca0bf',
        'quirra-emotion': '#5ad3e9',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'var(--font-geist)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-700px 0' },
          '100%': { backgroundPosition: '700px 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 1.5s ease-in-out forwards',
        'fade-in-up': 'fadeInUp 1.2s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in-slow': 'fadeIn 3s ease-in-out forwards',
        shimmer: 'shimmer 2s linear infinite',
      },
      boxShadow: {
        quirra: '0 0 24px rgba(76, 127, 255, 0.25)',
        'inner-glow': 'inset 0 0 12px rgba(76, 127, 255, 0.1)',
        'emotion-glow': '0 0 16px rgba(90, 211, 233, 0.4)',
      },
      backgroundImage: {
        'quirra-stars': 'radial-gradient(circle, rgba(76,127,255,0.15) 1px, transparent 1px)',
        'quirra-glow': 'linear-gradient(to right, rgba(21,32,75,0.8), rgba(7,11,24,0.9))',
      },
    },
  },
  plugins: [],
};

export default config;
