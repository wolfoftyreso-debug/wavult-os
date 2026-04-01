/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Muted background — bridges bg-muted/30 pattern
        muted: 'var(--color-border)',
        // Text hierarchy (legacy compat)
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          tertiary: '#94A3B8',
          muted: '#CBD5E1',
        },
        // Industrial Enterprise palette
        wavult: {
          bg: '#0A0F1E',         // deep navy
          surface: '#111929',    // card bg
          border: '#1E2D45',     // borders
          text: '#E2E8F0',       // primary text
          muted: '#475569',      // muted text
          accent: '#2563EB',     // interactive blue
          brand: '#1E40AF',      // brand steel blue
        },
        // Legacy compat
        brand: {
          primary: '#1E40AF',
          accent: '#2563EB',
          highlight: '#3B82F6',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
        },
        surface: {
          base: '#F8FAFC',
          raised: '#FFFFFF',
          overlay: '#F1F5F9',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Heading text
        'heading-xl': ['2rem', { lineHeight: '1.1', fontWeight: '600' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        // Label / micro text
        'label-xs': ['0.625rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],
        'label-2xs': ['0.5625rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.25s ease-in',
        'fade-in': 'fadeIn 0.2s ease-out',
        'resolve': 'resolve 0.4s ease-out',
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
      },
      spacing: {
        'focal': '60%',
        'peripheral': '40%',
      },
    },
  },
  plugins: [],
}
