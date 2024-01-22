import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {
  vueDsfrAutoimportPreset,
  ohVueIconAutoimportPreset,
  vueDsfrComponentResolver,
} from '@gouvminint/vue-dsfr'

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
  base: process.env.BASE_URL ?? '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['vue', 'oh-vue-icons'],
  },
  build: {
    target: 'ESNext',
  },
})
