import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// __SLUG__ is replaced with the app's slug by `pnpm new-app` at scaffold time.
export default defineConfig({
  base: '/__SLUG__/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true, // Fail if port is busy instead of incrementing
    proxy: {
      '/__SLUG__/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for /api/ws
      },
    },
  },
})
