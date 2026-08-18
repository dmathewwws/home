import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// fitness is replaced with the app's slug by `pnpm new-app` at scaffold time.
export default defineConfig({
  base: '/fitness/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true, // Fail if port is busy instead of incrementing
    proxy: {
      '/fitness/api': {
        target: 'http://localhost:8789',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for /api/ws
      },
    },
  },
})
