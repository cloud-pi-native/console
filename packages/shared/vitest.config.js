import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 2000,
    watch: false,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'lcov'],
      exclude: [
        '**/*.spec.js',
        'src/schemas/**/*',
      ],
    },
  },
})
