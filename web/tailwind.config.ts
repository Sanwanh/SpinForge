import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3B82F6',
          orange: '#F97316',
        },
        element: {
          wood: '#10B981',
          fire: '#EF4444',
          metal: '#94A3B8',
          water: '#3B82F6',
          earth: '#F59E0B',
        },
        rarity: {
          common: '#9CA3AF',
          rare: '#3B82F6',
          epic: '#A855F7',
          legendary: '#EAB308',
        },
        surface: {
          DEFAULT: '#030712',
          raised: '#111827',
          overlay: '#1F2937',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
