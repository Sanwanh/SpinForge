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
        // Mythic-Industrial palette (CSS variables in globals.css are the source of truth)
        abyss: '#050810',
        void: '#0a0e17',
        surface: {
          DEFAULT: '#050810',
          raised: '#111827',
          overlay: '#1f2937',
        },
        brand: {
          // map legacy blue/orange to gold for backward compatibility
          blue: '#00ccff',
          orange: '#ffb800',
          gold: '#d4af37',
          'gold-deep': '#b8941f',
        },
        element: {
          wood: '#00ff88',
          fire: '#ff4444',
          metal: '#c0c0c0',
          water: '#00ccff',
          earth: '#ffb800',
        },
        rarity: {
          common: '#8892a6',
          rare: '#00ccff',
          epic: '#a855f7',
          legendary: '#d4af37',
        },
        ink: {
          DEFAULT: '#e6e8ee',
          mute: '#8892a6',
          dim: '#4a5468',
        },
      },
      fontFamily: {
        display: ['Clash Grotesk', 'Cabinet Grotesk', 'system-ui', 'sans-serif'],
        ui: ['Cabinet Grotesk', 'DM Sans', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        han: ['Noto Serif TC', 'Songti TC', 'serif'],
      },
      animation: {
        'spin-slow': 'spin 30s linear infinite',
        'spin-fast': 'spin-fast 8s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float-y': 'float-y 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'spin-fast': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(-360deg)' },
        },
        'float-y': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      maxWidth: {
        shell: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
