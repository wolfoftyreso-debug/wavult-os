/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Wavult OS — Cream/Beige light system (LOCKED 2026-04-03, no dark mode)
        w: {
          bg: '#F5F0E8',
          surface: '#EDE8DF',
          card: '#FAF7F2',
          hover: '#EDE8DF',
          border: '#D8D0C4',
          'border-light': '#E4DDD4',
        },
        signal: {
          amber: '#C4651A',
          red: '#C0392B',
          green: '#4A7A5B',
          blue: '#2C5F7A',
        },
        tx: {
          primary: '#1A1612',
          secondary: '#4A4540',
          tertiary: '#7A7570',
          muted: '#A0998F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'action': ['1.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        'stat': ['2rem', { lineHeight: '1', fontWeight: '700' }],
        'label': ['0.625rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],
      },
      borderRadius: {
        'card': '1rem',
        'pill': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
