/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Wavult OS v2 — Atmospheric color system
        wavult: {
          charcoal: '#14181E',       // Deep matte charcoal — neutral/cruising
          carbon: '#0F1218',         // Deeper shade for contrast
          slate: '#1C2029',          // Raised surfaces
          steel: '#252A34',          // Overlay / hover states
          border: '#2A2F3A',         // Subtle borders
          'border-light': '#363C48', // Emphasized borders
        },
        // Signal colors — operational language
        signal: {
          amber: '#C4961A',          // Attention needed
          red: '#D94040',            // Action required — insistent, not alarming
          green: '#4A7A5B',          // Success/completion — muted, satisfying
          blue: '#4A7A9B',           // Informational
        },
        // Text hierarchy
        text: {
          primary: '#E8E9EB',        // High contrast primary
          secondary: '#8B919A',      // Secondary / labels
          tertiary: '#5A6170',       // Tertiary / metadata
          muted: '#3D4452',          // Very low emphasis
        },
        // Legacy compat
        brand: {
          primary: '#14181E',
          accent: '#C4961A',
          highlight: '#4A7A9B',
          success: '#4A7A5B',
          warning: '#C4961A',
          danger: '#D94040',
          premium: '#8B5CF6',
        },
        surface: {
          base: '#0F1218',
          raised: '#14181E',
          overlay: '#1C2029',
          border: '#2A2F3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Action text — disproportionately large
        'action-lg': ['2rem', { lineHeight: '1.1', fontWeight: '600' }],
        'action-md': ['1.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        // System telemetry
        'telemetry': ['0.625rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],
        'telemetry-sm': ['0.5625rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.25s ease-in',
        'fade-in': 'fadeIn 0.2s ease-out',
        'resolve': 'resolve 0.4s ease-out',
        'glow-amber': 'glowAmber 2s ease-in-out infinite',
        'glow-red': 'glowRed 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(8px)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        resolve: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(0.98)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        glowAmber: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(196, 150, 26, 0)' },
          '50%': { boxShadow: '0 0 8px 2px rgba(196, 150, 26, 0.15)' },
        },
        glowRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(217, 64, 64, 0)' },
          '50%': { boxShadow: '0 0 8px 2px rgba(217, 64, 64, 0.2)' },
        },
      },
      spacing: {
        'focal': '60%',
        'peripheral': '40%',
      },
    },
  },
  plugins: [],
}
