import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import WindiCSS from 'vite-plugin-windicss'
import vue from '@vitejs/plugin-vue'
import Markdown from 'vite-plugin-md'
import Prism from 'markdown-it-prism'
import emoji from 'markdown-it-emoji'
import LinkAttributes from 'markdown-it-link-attributes'
import { serverHost, serverPort, keycloakDomain, clientPort } from './src/utils/env.js'

const markdownWrapperClasses = 'text-left markdown-body'

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
    fs: {
      allow: [
        '../../packages/shared',
        '../..',
      ],
    },
  },
  define: {
    'process.env': process.env,
  },
  plugins: [
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Markdown({
      wrapperClasses: markdownWrapperClasses,
      markdownItOptions: {
        breaks: true,
        html: true,
        linkify: true,
        typographer: true,
      },
      markdownItSetup (md) {
        md.use(Prism)
        md.use(emoji)
        md.use(LinkAttributes, {
          pattern: /^https?:\/\//,
          attrs: {
            target: '_blank',
            rel: 'noopener',
          },
        })
      },
    }),
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
