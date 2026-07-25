import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@cpn-console/logger/hooks', replacement: path.resolve(__dirname, '../../packages/logger/src/hooks.ts') },
      { find: '@cpn-console/logger', replacement: path.resolve(__dirname, '../../packages/logger/src/index.ts') },
      { find: '@cpn-console/shared', replacement: path.resolve(__dirname, '../../packages/shared/src/index.ts') },
      { find: '@cpn-console/hooks', replacement: path.resolve(__dirname, '../../packages/hooks/src/index.ts') },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
