import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import vue from '@vitejs/plugin-vue'
import { serverHost, serverPort, clientPort } from './src/utils/env.js'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: Number(clientPort) || 8080,
    proxy: {
      '^/api': {
        target: `http://${serverHost}:${serverPort}`,
        changeOrigin: true,
        ws: true,
      },
    },
    fs: {
      allow: [
        './',
        '../../packages',
        '../../node_modules',
      ],
    },
  },
  define: {
    'process.env': process.env,
  },
  plugins: [
    vue(),
    UnoCSS(),
  ],
  base: process.env.BASE_URL || '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['vue', 'oh-vue-icons'],
  },
  build: {
    target: 'esnext',
  },
})
