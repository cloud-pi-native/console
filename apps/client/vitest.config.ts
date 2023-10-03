import { fileURLToPath } from 'node:url'
import { mergeConfig, type UserConfig } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig as UserConfig,
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
