/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'surface-bg': '#0F1115',
        'surface-panel': '#171A21',
        'surface-elevated': '#1F232B',
        'text-primary': '#E6E8EB',
        'text-secondary': '#A9B0BB',
        'accent-blue': '#4C8BF5',
        'accent-teal': '#5BA6A6',
        'status-success': '#4CAF50',
        'status-warning': '#F9A825',
        'status-critical': '#E53935',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 8s linear infinite',
        'scan-fast': 'scan 2s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
