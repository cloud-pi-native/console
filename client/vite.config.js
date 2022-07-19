import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig(mode => ({
  server: {
    host: mode === 'production' ? '127.0.0.1' : '0.0.0.0',
    port: 8080,
  },
  plugins: [
    vue(),
    vueJsx(),
    VitePWA({}),
  ],
  base: process.env.BASE_URL || '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['vue', 'oh-vue-icons'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 2000,
    watch: false,
    setupFiles: [
      './vitest-setup.js',
    ],
  },
}
))
