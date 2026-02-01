import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This is the ONLY setting you need.
    global: 'window', 
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          viz: ['d3', 'd3-geo', 'recharts', 'topojson-client']
        }
      }
    }
  }
})