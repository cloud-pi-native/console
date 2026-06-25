import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config.spec.utils'
import { nexusConfigFactory } from './nexus.config'

describe('nexusConfig', () => {
  beforeEach(() => { resetEnvs(['NEXUS_URL', 'NEXUS_INTERNAL_URL', 'NEXUS_ADMIN', 'NEXUS_ADMIN_PASSWORD', 'NEXUS__SECRET_EXPOSE_INTERNAL_URL']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config and composes internalOrPublicUrl/probeUrl', () => {
    vi.stubEnv('NEXUS_URL', 'https://nexus.example.com')
    vi.stubEnv('NEXUS_INTERNAL_URL', 'https://nexus.internal:8081')
    vi.stubEnv('NEXUS_ADMIN', 'admin')
    vi.stubEnv('NEXUS_ADMIN_PASSWORD', 'pw')
    expect(nexusConfigFactory()).toMatchObject({
      url: 'https://nexus.example.com',
      internalUrl: 'https://nexus.internal:8081',
      admin: 'admin',
      adminPassword: 'pw',
      secretExposeInternalUrl: false,
      internalOrPublicUrl: 'https://nexus.internal:8081',
      probeUrl: 'https://nexus.internal:8081/service/rest/v1/status',
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('NEXUS_URL', 'https://nexus.example.com')
    vi.stubEnv('NEXUS_ADMIN', 'admin')
    vi.stubEnv('NEXUS_ADMIN_PASSWORD', 'pw')
    const cfg = nexusConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.internalOrPublicUrl).toBe('https://nexus.example.com')
  })

  it('coerces the secret-expose flag', () => {
    vi.stubEnv('NEXUS_URL', 'https://nexus.example.com')
    vi.stubEnv('NEXUS_INTERNAL_URL', 'https://nexus.internal:8081')
    vi.stubEnv('NEXUS_ADMIN', 'admin')
    vi.stubEnv('NEXUS_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('NEXUS__SECRET_EXPOSE_INTERNAL_URL', 'true')
    expect(nexusConfigFactory().secretExposeInternalUrl).toBe(true)
  })

  it('throws when a required var is missing', () => {
    expect(() => nexusConfigFactory()).toThrow()
  })
})
