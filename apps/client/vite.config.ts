import * as dotenv from 'dotenv'
import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { configDefaults } from 'vitest/config'
import {
  vueDsfrAutoimportPreset,
  ohVueIconAutoimportPreset,
  vueDsfrComponentResolver,
} from '@gouvminint/vue-dsfr'

if (process.env.DOCKER !== 'true') {
  dotenv.config({ path: '.env' })
}

if (process.env.INTEGRATION === 'true') {
  const envInteg = dotenv.config({ path: '.env.integ' })
  process.env = {
    ...process.env,
    ...(envInteg?.parsed ?? {}),
  }
}

const serverHost = process.env.SERVER_HOST ?? 'localhost'
const serverPort = process.env.SERVER_PORT ?? 4000
const clientPort = process.env.CLIENT_PORT ?? 8080

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
  },
  define: {
    'process.env': process.env,
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
        // @ts-ignore
        ohVueIconAutoimportPreset,
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
    UnoCSS(),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['vue', 'oh-vue-icons'],
  },
  build: {
    target: 'ESNext',
  },
  optimizeDeps: {
    entries: [
      './cypress/components/specs/environment-form.ct.ts',
    ],
    include: [
      'oh-vue-icons',
      'jszip',
    ],
  },
  test: {
    root: fileURLToPath(new URL('./', import.meta.url)),
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/*'],
    testTimeout: 2000,
    watch: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/*.spec.js'],
    },
  },
})
