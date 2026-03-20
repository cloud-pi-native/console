import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'
import {
  vueDsfrAutoimportPreset,
  vueDsfrComponentResolver,
} from '@gouvminint/vue-dsfr/meta'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const require = createRequire(import.meta.url)
const vue = require('@vitejs/plugin-vue').default

// https://vitejs.dev/config/
export default defineConfig(() => {
  const originalEnv = { ...process.env }

  if (process.env.DOCKER !== 'true') {
    const baseEnv = loadEnv('base', process.cwd(), '')
    for (const [key, value] of Object.entries(baseEnv)) {
      if (typeof originalEnv[key] === 'undefined') {
        process.env[key] = value
      }
    }
  }

  if (process.env.INTEGRATION === 'true') {
    const baseEnv = loadEnv('base', process.cwd(), '')
    const integEnv = loadEnv('integ', process.cwd(), '')
    const integOverrides = Object.fromEntries(
      Object.entries(integEnv).filter(([key, value]) => baseEnv[key] !== value),
    )

    process.env = {
      ...process.env,
      ...integOverrides,
    }
  }

  const serverHost = process.env.SERVER_HOST ?? 'localhost'
  const serverPort = process.env.SERVER_PORT ?? 4000
  const clientPort = process.env.CLIENT_PORT ?? 8080

  const define = process.env.NODE_ENV === 'production'
    ? { 'process.env': { APP_VERSION: process.env.APP_VERSION } }
    : { 'process.env': process.env }

  return {
    server: {
      host: '0.0.0.0',
      port: Number(clientPort) || 8080,
      proxy: {
        '^/api': {
          target: `http://${serverHost}:${serverPort}`,
          changeOrigin: true,
          ws: true,
        },
        '^/swagger-ui': {
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
        extendTheme: (theme: any) => {
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
            /^\/swagger-ui/,
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
  }
})
