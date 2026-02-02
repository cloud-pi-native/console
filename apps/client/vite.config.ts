import { URL, fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import UnoCSS from 'unocss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VitePWA } from 'vite-plugin-pwa'
import {
  vueDsfrAutoimportPreset,
  vueDsfrComponentResolver,
} from '@gouvminint/vue-dsfr/meta'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const serverHost = env.SERVER_HOST ?? 'localhost'
  const serverPort = env.SERVER_PORT ?? 4000
  const clientPort = env.PORT ?? 8080

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
      UnoCSS<{ breakpoints: Record<string, string> }>({
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
      entries: [
        './cypress/components/specs/environment-form.ct.ts',
      ],
      include: [
        'jszip',
      ],
    },
  }
})
