import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config.spec.utils'
import { serviceChainConfigFactory } from './service-chain.config'

describe('serviceChainConfig', () => {
  beforeEach(() => { resetEnvs(['OPENCDS_URL', 'OPENCDS_INTERNAL_URL', 'OPENCDS_API_TOKEN', 'OPENCDS_API_TLS_REJECT_UNAUTHORIZED']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config and composes probeUrl', () => {
    vi.stubEnv('OPENCDS_URL', 'https://opencds.example.com')
    vi.stubEnv('OPENCDS_INTERNAL_URL', 'https://opencds.internal:8080')
    vi.stubEnv('OPENCDS_API_TOKEN', 'token')
    vi.stubEnv('OPENCDS_API_TLS_REJECT_UNAUTHORIZED', 'true')
    expect(serviceChainConfigFactory()).toMatchObject({
      url: 'https://opencds.example.com',
      internalUrl: 'https://opencds.internal:8080',
      apiToken: 'token',
      apiTlsRejectUnauthorized: true,
      probeUrl: 'https://opencds.internal:8080/api/v1/health',
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('OPENCDS_URL', 'https://opencds.example.com')
    vi.stubEnv('OPENCDS_API_TOKEN', 'token')
    const cfg = serviceChainConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.probeUrl).toBe('https://opencds.example.com/api/v1/health')
  })

  it('honours an explicit false TLS flag', () => {
    vi.stubEnv('OPENCDS_URL', 'https://opencds.example.com')
    vi.stubEnv('OPENCDS_INTERNAL_URL', 'https://opencds.internal:8080')
    vi.stubEnv('OPENCDS_API_TOKEN', 'token')
    vi.stubEnv('OPENCDS_API_TLS_REJECT_UNAUTHORIZED', '0')
    expect(serviceChainConfigFactory().apiTlsRejectUnauthorized).toBe(false)
  })

  it('defaults OPENCDS_API_TLS_REJECT_UNAUTHORIZED to true when unset', () => {
    vi.stubEnv('OPENCDS_URL', 'https://opencds.example.com')
    vi.stubEnv('OPENCDS_API_TOKEN', 'token')
    expect(serviceChainConfigFactory().apiTlsRejectUnauthorized).toBe(true)
  })

  it('throws when a required var is missing', () => {
    expect(() => serviceChainConfigFactory()).toThrow()
  })
})
