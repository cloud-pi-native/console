import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config-testing.utils'
import { vaultConfigFactory } from './vault.config'

describe('vaultConfig', () => {
  beforeEach(() => { resetEnvs(['VAULT_TOKEN', 'VAULT_URL', 'VAULT_INTERNAL_URL', 'VAULT_KV_NAME']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config', () => {
    vi.stubEnv('VAULT_URL', 'https://vault.internal')
    vi.stubEnv('VAULT_INTERNAL_URL', 'https://vault.internal:8200')
    vi.stubEnv('VAULT_TOKEN', 'token')
    expect(vaultConfigFactory()).toMatchObject({
      url: 'https://vault.internal',
      internalUrl: 'https://vault.internal:8200',
      token: 'token',
      kvName: 'forge-dso',
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('VAULT_URL', 'https://vault.internal')
    vi.stubEnv('VAULT_TOKEN', 'token')
    const cfg = vaultConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.url).toBe('https://vault.internal')
  })

  it('throws when a required var is missing', () => {
    expect(() => vaultConfigFactory()).toThrow()
  })
})
