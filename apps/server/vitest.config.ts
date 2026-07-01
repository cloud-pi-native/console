import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

const rootDir = fileURLToPath(new URL('./', import.meta.url))

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      alias: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        // Workspace packages - resolve to source files to bypass Vite 8 / Rolldown dep scanner
        { find: '@cpn-console/hooks', replacement: path.resolve(rootDir, '../../packages/hooks/src/index.ts') },
        { find: '@cpn-console/logger/hooks', replacement: path.resolve(rootDir, '../../packages/logger/src/hooks.ts') },
        { find: '@cpn-console/logger', replacement: path.resolve(rootDir, '../../packages/logger/src/index.ts') },
        { find: '@cpn-console/shared', replacement: path.resolve(rootDir, '../../packages/shared/src/index.ts') },
        // Plugins - resolve to source files to bypass Vite 8 / Rolldown dep scanner
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
      reporters: ['default', 'hanging-process'],
      environment: 'node',
      testTimeout: 2000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.ts'],
        exclude: [
          '**/types',
          '**/mocks',
          '**/*.spec.ts',
          '**/*.d.ts',
          '**/queries.ts',
          '**/mocks.ts',
        ],
      },
      include: ['src/**/*.spec.{ts,js}'],
      exclude: [...configDefaults.exclude, 'e2e/*'],
      setupFiles: ['./vitest-init.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      pool: 'forks',
    },
  }),
)
