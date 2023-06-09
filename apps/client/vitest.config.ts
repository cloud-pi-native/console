import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
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
  }),
)
