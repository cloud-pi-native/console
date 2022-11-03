import { defineConfig } from 'vite'

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
