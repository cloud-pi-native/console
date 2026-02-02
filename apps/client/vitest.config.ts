import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig(env => mergeConfig(
  viteConfig(env),
  {
    test: {
      reporters: ['default', 'hanging-process'],
      environment: 'jsdom',
      testTimeout: 2000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**'],
        exclude: [
          '**/types',
          '**/mocks',
          '**/*.spec.ts',
          '**/*.d.ts',
          '**/*.vue',
          'src/main.ts',
          'src/icons.ts',
          'src/router/index.ts',
        ],
      },
      include: ['src/**/*.spec.{ts,js}'],
      exclude: [...configDefaults.exclude, 'e2e/*'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      pool: 'forks',
    },
  },
))
