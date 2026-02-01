/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-black': '#050505',
        'panel-bg': 'rgba(22, 27, 34, 0.85)',
        'panel-border': '#30363d',
        'text-primary': '#e6edf3',
        'text-secondary': '#8b949e',
        'accent-blue': '#00f0ff',
        'accent-green': '#39ff14',
        'accent-red': '#ff2a2a',
      },
      fontFamily: {
        header: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
