import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cpn-console/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@cpn-console/hooks': path.resolve(__dirname, '../../packages/hooks/src/index.ts'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
