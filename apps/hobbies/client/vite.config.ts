import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// hobbies is replaced with the app's slug by `pnpm new-app` at scaffold time.
export default defineConfig({
  base: '/hobbies/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5176,
    strictPort: true, // Fail if port is busy instead of incrementing
    proxy: {
      '/hobbies/api': {
        target: 'http://localhost:8790',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for /api/ws
      },
    },
  },
})
