import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// recipes is replaced with the app's slug by `pnpm new-app` at scaffold time.
export default defineConfig({
  base: '/recipes/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true, // Fail if port is busy instead of incrementing
    proxy: {
      '/recipes/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for /api/ws
      },
    },
  },
})
