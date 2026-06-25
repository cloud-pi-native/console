import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { baseConfigFactory } from './base.config'
import { resetEnvs } from './config-testing.utils'

describe('baseConfig', () => {
  beforeEach(() => { resetEnvs(['NODE_ENV', 'CI', 'SERVER_HOST', 'SERVER_PORT', 'APP_VERSION', 'DB_URL', 'PROJECTS_ROOT_DIR']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config and derives env flags', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('CI', 'true')
    vi.stubEnv('SERVER_HOST', 'host')
    vi.stubEnv('SERVER_PORT', '4000')
    vi.stubEnv('APP_VERSION', '1.2.3')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    vi.stubEnv('DB_URL', 'postgres://db')
    expect(baseConfigFactory()).toEqual({
      isTest: false,
      isDev: true,
      isCI: true,
      isProd: false,
      serverHost: 'host',
      serverPort: 4000,
      appVersion: 'dev',
      dbUrl: 'postgres://db',
      projectsRootDir: 'forge-test/projects',
    })
  })

  it('uses APP_VERSION in production, "dev" otherwise', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CI', 'true')
    vi.stubEnv('SERVER_HOST', 'host')
    vi.stubEnv('SERVER_PORT', '4000')
    vi.stubEnv('APP_VERSION', '1.2.3')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    vi.stubEnv('DB_URL', 'postgres://db')
    expect(baseConfigFactory().appVersion).toBe('1.2.3')
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('CI', 'true')
    vi.stubEnv('SERVER_HOST', 'host')
    vi.stubEnv('SERVER_PORT', '4000')
    vi.stubEnv('APP_VERSION', '1.2.3')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    vi.stubEnv('DB_URL', 'postgres://db')
    expect(baseConfigFactory().appVersion).toBe('dev')
  })

  it('applies defaults when optional vars are absent', () => {
    vi.stubEnv('DB_URL', 'postgres://default')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'r')
    vi.stubEnv('NODE_ENV', 'production')
    expect(baseConfigFactory()).toMatchObject({
      isDev: false,
      isProd: true,
      isCI: false,
      serverHost: 'localhost',
      serverPort: 0,
      appVersion: 'unknown',
      dbUrl: 'postgres://default',
    })
  })
})
