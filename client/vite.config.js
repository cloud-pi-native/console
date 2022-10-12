import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import WindiCSS from 'vite-plugin-windicss'
import vue from '@vitejs/plugin-vue'
import { keycloakHost, keycloakPort } from './src/utils/keycloak/sso-config.js'

const serverHost = process.env.SERVER_HOST
const serverPort = process.env.SERVER_PORT

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '^/realms': {
        target: `http://${keycloakHost}:${keycloakPort}`,
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
},
)
