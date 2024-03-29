import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      reporters: ['default', 'hanging-process'],
      environment: 'node',
      testTimeout: 2000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        exclude: [
          ...configDefaults.exclude,
          '**/__mocks__/**',
          '**/*.spec.ts',
        ],
      },
      setupFiles: ['./vitest-init.ts'],
      exclude: [...configDefaults.exclude, 'e2e/*'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
