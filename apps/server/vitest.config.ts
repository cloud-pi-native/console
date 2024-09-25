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
        include: ['src/**'],
        exclude: [
          '**/types',
          '**/mocks',
          '**/*.spec.ts',
          '**/*.d.ts',
          '**/*.vue',
          '**/queries.ts',
          '**/mocks.ts',
        ],
      },
      include: ['src/**/*.spec.{ts,js}'],
      exclude: [...configDefaults.exclude, 'e2e/*'],
      setupFiles: ['./vitest-init.ts', './src/__mocks__/prisma.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      pool: 'forks',
    },
  }),
)
