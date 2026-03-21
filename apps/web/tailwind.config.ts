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
        // Dark backgrounds
        c0: '#060C18',
        c1: '#0A1428',
        c2: '#0F1C38',
        c3: '#162040',
        c4: '#1E2D4E',
        c5: '#243560',
        c6: '#2A3D70',
        c7: '#304585',
        // Accent
        accent: {
          DEFAULT: '#3B7DFF',
          hover: '#2B6EE8',
          light: 'rgba(59, 125, 255, 0.15)',
        },
        // Text
        text: {
          primary: '#F1F5FE',
          secondary: '#8899BB',
          muted: '#4A5A7A',
          disabled: '#2A3A5A',
        },
        // Semantic
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        heading: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
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
      },
    },
  },
  plugins: [],
}

export default config
