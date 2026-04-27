import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { bannerDevPlugin } from './dev-server/banner-dev-plugin.js'

export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  plugins: [bannerDevPlugin()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        control: resolve(import.meta.dirname, 'control.html'),
      },
    },
  },
  server: {
    host: true, // expose on LAN for mobile testing
    port: 5173,
  },
})
