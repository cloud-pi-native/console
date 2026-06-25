import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config-testing.utils'
import { sonarqubeConfigFactory } from './sonarqube.config'

describe('sonarqubeConfig', () => {
  beforeEach(() => { resetEnvs(['SONARQUBE_URL', 'SONARQUBE_INTERNAL_URL', 'SONAR_API_TOKEN']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config', () => {
    vi.stubEnv('SONARQUBE_URL', 'https://sonar.internal')
    vi.stubEnv('SONARQUBE_INTERNAL_URL', 'https://sonar.internal:9000')
    vi.stubEnv('SONAR_API_TOKEN', 'token')
    expect(sonarqubeConfigFactory()).toMatchObject({
      url: 'https://sonar.internal',
      internalUrl: 'https://sonar.internal:9000',
      apiToken: 'token',
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('SONARQUBE_URL', 'https://sonar.internal')
    vi.stubEnv('SONAR_API_TOKEN', 'token')
    const cfg = sonarqubeConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.url).toBe('https://sonar.internal')
  })

  it('throws when a required var is missing', () => {
    expect(() => sonarqubeConfigFactory()).toThrow()
  })
})
