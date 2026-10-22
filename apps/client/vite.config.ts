import { fileURLToPath, URL } from 'node:url'
import {
  vueDsfrAutoimportPreset,
  vueDsfrComponentResolver,
} from '@gouvminint/vue-dsfr/meta'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const serverHost = process.env.SERVER_HOST ?? 'localhost'
const serverPort = process.env.SERVER_PORT ?? 4000
const clientPort = process.env.CLIENT_PORT ?? 8080

const publicClientEnv = {
  NODE_ENV: process.env.NODE_ENV,
  SERVER_HOST: process.env.SERVER_HOST,
  SERVER_PORT: process.env.SERVER_PORT,
  CLIENT_PORT: process.env.CLIENT_PORT,
  KEYCLOAK_PROTOCOL: process.env.KEYCLOAK_PROTOCOL,
  KEYCLOAK_DOMAIN: process.env.KEYCLOAK_DOMAIN,
  KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
  KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
  KEYCLOAK_REDIRECT_URI: process.env.KEYCLOAK_REDIRECT_URI,
  OPENCDS_ENABLED: process.env.OPENCDS_ENABLED,
  CONTACT_EMAIL: process.env.CONTACT_EMAIL,
}

const define = process.env.NODE_ENV === 'production'
  ? { 'process.env': { APP_VERSION: process.env.APP_VERSION } }
  : { 'process.env': publicClientEnv }

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
      '^/swagger-ui-server': {
        target: `http://${serverHost}:${serverPort}`,
        changeOrigin: true,
        ws: true,
      },
      '^/swagger-ui-server-nestjs': {
        target: `http://${serverHost}:${serverPort}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  define,
  plugins: [
    vue(),
    AutoImport({
      imports: [
        // @ts-ignore
        'vue',
        // @ts-ignore
        'vue-router',
        // @ts-ignore
        'pinia',
        // @ts-ignore
        vueDsfrAutoimportPreset,
      ],
      vueTemplate: true,
      dts: './src/auto-imports.d.ts',
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
        globalsPropValue: true,
      },
    }),
    Components({
      extensions: ['vue'],
      dirs: [
        './src/components',
        './src/views',
      ],
      include: [/\.vue$/, /\.vue\?vue/],
      dts: './src/components.d.ts',
      resolvers: [
        vueDsfrComponentResolver,
      ],
    }),
    UnoCSS({
      extendTheme: (theme) => {
        return {
          ...theme,
          breakpoints: {
            ...theme.breakpoints,
            dsfrmenu: '992px',
          },
        }
      },
    }),
    VitePWA({
      registerType: 'prompt', // autoUpdate
      // disable: true,
      // selfDestroying: true,
      workbox: {
        maximumFileSizeToCacheInBytes: 5_000_000,
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [
          /^\/api/,
          /^\/swagger-ui-server/,
          /^\/swagger-ui-server-nestjs/,
        ],
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Console Cloud Pi Native',
        short_name: 'CPiN',
        description: 'Une console web pour les controler tous',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#42b883',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '16x16',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['vue'],
  },
  build: {
    target: 'ESNext',
  },
  optimizeDeps: {
    include: [
      'jszip',
    ],
  },
})
