import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 2000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: ['**/types', '**/mocks', '**/*.spec.ts', '**/*.d.ts'],
    },
    include: ['src/**/*.spec.{ts,js}'],
    exclude: [...configDefaults.exclude],
  },
})
