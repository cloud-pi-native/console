import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import WindiCSS from 'vite-plugin-windicss'
import vue from '@vitejs/plugin-vue'
import { keycloakDomain } from './src/utils/keycloak/config.js'

const serverHost = process.env.SERVER_HOST
const serverPort = process.env.SERVER_PORT
const clientPort = process.env.CLIENT_PORT

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: clientPort || 8080,
    proxy: {
      '^/realms': {
        target: `http://${keycloakDomain}`,
        changeOrigin: true,
        ws: true,
      },
      '^/api': {
        target: `http://${serverHost}:${serverPort}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  define: {
    'process.env': process.env,
  },
  plugins: [
    vue(),
    WindiCSS(),
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
    coverage: {
      provider: 'c8',
      reporter: ['text', 'lcov'],
      exclude: ['**/*.spec.js'],
    },
  },
})
