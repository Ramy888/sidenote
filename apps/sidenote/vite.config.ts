import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  // The hosted on-device check ships next to the app (T3, stock-profile Nano on the Hosting origin).
  build: { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), hosted: resolve(__dirname, 'spikes/hosted.html') } } },
})
