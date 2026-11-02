import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@firebase/webchannel-wrapper') || id.includes('webchannel-wrapper')) {
              return 'vendor-webchannel';
            }
            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) {
              return 'vendor-firebase-firestore';
            }
            if (
              id.includes('@firebase/auth') ||
              id.includes('firebase/auth') ||
              id.includes('@firebase/app') ||
              id.includes('firebase/app')
            ) {
              return 'vendor-firebase-core';
            }
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'vendor-firebase-misc';
            }
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('react-router-dom') ||
              id.includes('/react/') ||
              id.includes('\\react\\')
            ) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query') || id.includes('axios')) {
              return 'vendor-data';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
})
