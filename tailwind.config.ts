import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.45', letterSpacing: '-0.005em' }],
        lg: ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
      colors: {
        indigo: {
          50: '#EAFBEE', 100: '#CFF6DA', 200: '#9FEBB6', 300: '#6EDD8F',
          400: '#43CD6C', 500: '#30D158', 600: '#22A344', 700: '#1B7D36',
          800: '#165F2A', 900: '#124A22',
        },
        emerald: {
          50: '#EFFBFA', 100: '#D3F3F0', 200: '#A8E7E1', 300: '#7EDBD3',
          400: '#66D4CF', 500: '#45C0BA', 600: '#349A95', 700: '#297874',
          800: '#225F5C', 900: '#1D4E4B',
        },
        radar: {
          950: '#05070a',
          900: '#0a0e10',
          850: '#0b0d12',
          800: '#111827',
          700: '#1a2340',
          600: '#1e2d4a',
          500: '#243357',
          accent: '#30D158',
          'accent-light': '#5CE082',
          'accent-dark': '#248C40',
          success: '#66D4CF',
          amber: '#f59e0b',
          rose: '#f43f5e',
          neutral: '#8E8E93',
          info: '#FF9F0A',
          teal: '#30B0C7',
        },
      },
      backgroundImage: {
        'radar-gradient': 'linear-gradient(135deg, #05070a 0%, #0b0d12 50%, #111827 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'radar-scan': 'radar-scan 2s linear infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'radar-scan': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
