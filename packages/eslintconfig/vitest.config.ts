import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.{ts,js}'],
    exclude: [...configDefaults.exclude],
  },
})
