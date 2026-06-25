import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config.spec.utils'
import { sonarqubeConfigFactory } from './sonarqube.config'

describe('sonarqubeConfig', () => {
  beforeEach(() => { resetEnvs(['SONARQUBE_URL', 'SONARQUBE_INTERNAL_URL', 'SONAR_API_TOKEN']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config and composes internalOrPublicUrl/probeUrl', () => {
    vi.stubEnv('SONARQUBE_URL', 'https://sonar.example.com')
    vi.stubEnv('SONARQUBE_INTERNAL_URL', 'https://sonar.internal:9000')
    vi.stubEnv('SONAR_API_TOKEN', 'token')
    expect(sonarqubeConfigFactory()).toMatchObject({
      url: 'https://sonar.example.com',
      internalUrl: 'https://sonar.internal:9000',
      apiToken: 'token',
      internalOrPublicUrl: 'https://sonar.internal:9000',
      probeUrl: 'https://sonar.internal:9000/api/system/health',
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('SONARQUBE_URL', 'https://sonar.example.com')
    vi.stubEnv('SONAR_API_TOKEN', 'token')
    const cfg = sonarqubeConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.internalOrPublicUrl).toBe('https://sonar.example.com')
  })

  it('throws when a required var is missing', () => {
    expect(() => sonarqubeConfigFactory()).toThrow()
  })
})
