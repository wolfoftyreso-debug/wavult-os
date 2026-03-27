/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Wavult OS v2 — Atmospheric color system (shared with command-center)
        w: {
          bg: '#0F1218',
          surface: '#14181E',
          card: '#1C2029',
          hover: '#252A34',
          border: '#2A2F3A',
          'border-light': '#363C48',
        },
        signal: {
          amber: '#C4961A',
          red: '#D94040',
          green: '#4A7A5B',
          blue: '#4A7A9B',
        },
        tx: {
          primary: '#E8E9EB',
          secondary: '#8B919A',
          tertiary: '#5A6170',
          muted: '#3D4452',
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
