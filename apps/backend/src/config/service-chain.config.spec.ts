import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config-testing.utils'
import { serviceChainConfigFactory } from './service-chain.config'

describe('serviceChainConfig', () => {
  beforeEach(() => { resetEnvs(['OPENCDS_URL', 'OPENCDS_INTERNAL_URL', 'OPENCDS_API_TOKEN', 'OPENCDS_API_TLS_REJECT_UNAUTHORIZED']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config', () => {
    vi.stubEnv('OPENCDS_URL', 'https://opencds.internal')
    vi.stubEnv('OPENCDS_INTERNAL_URL', 'https://opencds.internal:8080')
    vi.stubEnv('OPENCDS_API_TOKEN', 'token')
    expect(serviceChainConfigFactory()).toMatchObject({
      url: 'https://opencds.internal',
      internalUrl: 'https://opencds.internal:8080',
      apiToken: 'token',
      apiTlsRejectUnauthorized: true,
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('OPENCDS_URL', 'https://opencds.internal')
    vi.stubEnv('OPENCDS_API_TOKEN', 'token')
    const cfg = serviceChainConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.url).toBe('https://opencds.internal')
  })

  it('coerces the tls reject flag', () => {
    vi.stubEnv('OPENCDS_URL', 'https://opencds.internal')
    vi.stubEnv('OPENCDS_INTERNAL_URL', 'https://opencds.internal:8080')
    vi.stubEnv('OPENCDS_API_TOKEN', 'token')
    vi.stubEnv('OPENCDS_API_TLS_REJECT_UNAUTHORIZED', '0')
    expect(serviceChainConfigFactory().apiTlsRejectUnauthorized).toBe(false)
  })

  it('throws when a required var is missing', () => {
    expect(() => serviceChainConfigFactory()).toThrow()
  })
})
