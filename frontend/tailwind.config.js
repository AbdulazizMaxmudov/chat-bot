/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'main-bg': '#000000', // Pure black for CyberSec theme
        'neon-blue': '#00f3ff', // Electric Cyber Blue
        'neon-dark': '#0055ff', // Darker blue for active states
        'eco-green': '#00ff41', // Hacker Green
        'accent-purple': '#ff003c', // Cyberpunk Red (replacing purple)
        'surface-100': 'rgba(10, 10, 10, 0.9)',
        'surface-200': 'rgba(20, 20, 20, 0.7)',
        'surface-300': 'rgba(30, 30, 30, 0.5)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Orbitron', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'glow': 'none',
        'glow-green': 'none',
        'glow-red': 'none',
        'glow-sm': 'none',
        'glow-input': 'none',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}