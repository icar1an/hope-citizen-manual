import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  plugins: [],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    host: true, // expose on LAN for mobile testing
    port: 5173,
  },
})
