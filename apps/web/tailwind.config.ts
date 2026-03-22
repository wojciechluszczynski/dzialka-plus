import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Main content backgrounds (light)
        bg: '#F8F9FA',
        surface: '#FFFFFF',
        'surface-2': '#F1F3F5',

        // Sidebar (dark navy)
        sidebar: {
          DEFAULT: '#1E2B3C',
          dark: '#1A2535',
          hover: 'rgba(255,255,255,0.06)',
          active: 'rgba(249,115,22,0.15)',
        },

        // Accent orange
        accent: {
          DEFAULT: '#F97316',
          hover: '#EA6C10',
          light: 'rgba(249,115,22,0.12)',
        },

        // Text
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          disabled: '#D1D5DB',
        },

        // Sidebar text
        'sidebar-text': '#E2E8F0',
        'sidebar-muted': '#94A3B8',

        // Semantic
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',

        // Legacy compat (used in some components)
        c0: '#F8F9FA',
        c1: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: '#E5E7EB',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
        lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}

export default config
