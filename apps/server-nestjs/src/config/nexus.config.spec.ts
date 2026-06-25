import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config-testing.utils'
import { nexusConfigFactory } from './nexus.config'

describe('nexusConfig', () => {
  beforeEach(() => { resetEnvs(['NEXUS_URL', 'NEXUS_INTERNAL_URL', 'NEXUS_ADMIN', 'NEXUS_ADMIN_PASSWORD', 'NEXUS__SECRET_EXPOSE_INTERNAL_URL']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config', () => {
    vi.stubEnv('NEXUS_URL', 'https://nexus.internal')
    vi.stubEnv('NEXUS_INTERNAL_URL', 'https://nexus.internal:8081')
    vi.stubEnv('NEXUS_ADMIN', 'admin')
    vi.stubEnv('NEXUS_ADMIN_PASSWORD', 'pw')
    expect(nexusConfigFactory()).toMatchObject({
      url: 'https://nexus.internal',
      internalUrl: 'https://nexus.internal:8081',
      admin: 'admin',
      adminPassword: 'pw',
      secretExposeInternalUrl: false,
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('NEXUS_URL', 'https://nexus.internal')
    vi.stubEnv('NEXUS_ADMIN', 'admin')
    vi.stubEnv('NEXUS_ADMIN_PASSWORD', 'pw')
    const cfg = nexusConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.url).toBe('https://nexus.internal')
  })

  it('coerces the secret-expose flag', () => {
    vi.stubEnv('NEXUS_URL', 'https://nexus.internal')
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
