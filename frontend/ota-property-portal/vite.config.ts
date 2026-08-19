import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5177,
  },
  build: {
    assetsDir: 'static',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge'],
          'vendor-utils': ['date-fns'],
          'vendor-query': ['@tanstack/react-query'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})
