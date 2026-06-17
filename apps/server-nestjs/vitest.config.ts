import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: '@cpn-console/hooks', replacement: path.resolve(rootDir, '../../packages/hooks/src/index.ts') },
      { find: '@cpn-console/logger/hooks', replacement: path.resolve(rootDir, '../../packages/logger/src/hooks.ts') },
      { find: '@cpn-console/logger', replacement: path.resolve(rootDir, '../../packages/logger/src/index.ts') },
      { find: '@cpn-console/shared', replacement: path.resolve(rootDir, '../../packages/shared/src/index.ts') },
      { find: '@cpn-console/argocd-plugin', replacement: path.resolve(rootDir, '../../plugins/argocd/src/index.ts') },
      { find: '@cpn-console/gitlab-plugin', replacement: path.resolve(rootDir, '../../plugins/gitlab/src/index.ts') },
      { find: '@cpn-console/harbor-plugin', replacement: path.resolve(rootDir, '../../plugins/harbor/src/index.ts') },
      { find: '@cpn-console/keycloak-plugin', replacement: path.resolve(rootDir, '../../plugins/keycloak/src/index.ts') },
      { find: '@cpn-console/nexus-plugin', replacement: path.resolve(rootDir, '../../plugins/nexus/src/index.ts') },
      { find: '@cpn-console/sonarqube-plugin', replacement: path.resolve(rootDir, '../../plugins/sonarqube/src/index.ts') },
      { find: '@cpn-console/vault-plugin', replacement: path.resolve(rootDir, '../../plugins/vault/src/index.ts') },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'test/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.d.ts',
      ],
    },
    exclude: [...configDefaults.exclude, 'e2e/*'],
    root: fileURLToPath(new URL('./', import.meta.url)),
    pool: 'forks',
  },
})
