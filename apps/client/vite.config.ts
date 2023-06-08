import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import vue from '@vitejs/plugin-vue'
import Markdown from 'vite-plugin-md'
import Prism from 'markdown-it-prism'
import emoji from 'markdown-it-emoji'
import LinkAttributes from 'markdown-it-link-attributes'
import { serverHost, serverPort, clientPort } from './src/utils/env.js'

const markdownWrapperClasses = 'text-left markdown-body'

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
    UnoCSS(),
  ],
  base: process.env.BASE_URL || '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['vue', 'oh-vue-icons'],
  },
})
