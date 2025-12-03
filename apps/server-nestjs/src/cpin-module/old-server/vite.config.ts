/// <reference types="vitest" />
import { URL, fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    poolMatchGlobs: [
      ['**/resources/**/*.spec.ts', 'forks'],
    ],
  },
})
