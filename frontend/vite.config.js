import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    // SPA Fallback for development - ensures all routes fallback to index.html
    middlewares: {
      order: 'post',
      handler: (req, res, next) => {
        if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.includes('.')) {
          req.url = '/index.html'
        }
        return next()
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Ensures SPA fallback works in production
        fallback: 'index.html',
      },
    },
  },
})
