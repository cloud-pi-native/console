import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config.spec.utils'
import { vaultConfigFactory } from './vault.config'

describe('vaultConfig', () => {
  beforeEach(() => { resetEnvs(['VAULT_TOKEN', 'VAULT_URL', 'VAULT_INTERNAL_URL', 'VAULT_KV_NAME']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config and composes internalOrPublicUrl/probeUrl', () => {
    vi.stubEnv('VAULT_URL', 'https://vault.example.com')
    vi.stubEnv('VAULT_INTERNAL_URL', 'https://vault.internal:8200')
    vi.stubEnv('VAULT_TOKEN', 'token')
    expect(vaultConfigFactory()).toMatchObject({
      url: 'https://vault.example.com',
      internalUrl: 'https://vault.internal:8200',
      token: 'token',
      kvName: 'forge-dso',
      internalOrPublicUrl: 'https://vault.internal:8200',
      probeUrl: 'https://vault.internal:8200/v1/sys/health',
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('VAULT_URL', 'https://vault.example.com')
    vi.stubEnv('VAULT_TOKEN', 'token')
    const cfg = vaultConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.internalOrPublicUrl).toBe('https://vault.example.com')
  })

  it('throws when a required var is missing', () => {
    expect(() => vaultConfigFactory()).toThrow()
  })
})
