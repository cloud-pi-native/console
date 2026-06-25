import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config.spec.utils'
import { keycloakConfigFactory } from './keycloak.config'

describe('keycloakConfig', () => {
  beforeEach(() => { resetEnvs(['KEYCLOAK_PROTOCOL', 'KEYCLOAK_DOMAIN', 'KEYCLOAK_REALM', 'KEYCLOAK_CLIENT_ID', 'KEYCLOAK_CLIENT_SECRET', 'KEYCLOAK_ADMIN', 'KEYCLOAK_ADMIN_PASSWORD', 'KEYCLOAK_ADMIN_CLIENT_ID', 'KEYCLOAK_REDIRECT_URI', 'KEYCLOAK_JWKS_CACHE_TTL_MS', 'KEYCLOAK_JWKS_TIMEOUT_MS', 'KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS', 'ADMIN_KC_USER_ID']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('composes url/realmUrl/openidConfigurationUrl and parses csv admin ids', () => {
    vi.stubEnv('KEYCLOAK_DOMAIN', 'kc.example.com')
    vi.stubEnv('KEYCLOAK_REALM', 'dso')
    vi.stubEnv('KEYCLOAK_CLIENT_ID', 'frontend')
    vi.stubEnv('KEYCLOAK_CLIENT_SECRET', 'secret')
    vi.stubEnv('KEYCLOAK_ADMIN', 'admin')
    vi.stubEnv('KEYCLOAK_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('KEYCLOAK_REDIRECT_URI', 'https://localhost:8080')
    vi.stubEnv('ADMIN_KC_USER_ID', 'a,b , c')
    expect(keycloakConfigFactory()).toMatchObject({
      protocol: 'https',
      domain: 'kc.example.com',
      realm: 'dso',
      adminClientId: 'admin-cli',
      url: 'https://kc.example.com',
      realmUrl: 'https://kc.example.com/realms/dso',
      openidConfigurationUrl: 'https://kc.example.com/realms/dso/.well-known/openid-configuration',
      adminKcUserId: ['a', 'b', 'c'],
      jwksCacheTtlMs: 300_000,
      jwksTimeoutMs: 5_000,
      openidConfigurationCacheTtlMs: 300_000,
    })
  })

  it('honours an explicit protocol', () => {
    vi.stubEnv('KEYCLOAK_DOMAIN', 'kc.example.com')
    vi.stubEnv('KEYCLOAK_REALM', 'dso')
    vi.stubEnv('KEYCLOAK_CLIENT_ID', 'frontend')
    vi.stubEnv('KEYCLOAK_CLIENT_SECRET', 'secret')
    vi.stubEnv('KEYCLOAK_ADMIN', 'admin')
    vi.stubEnv('KEYCLOAK_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('KEYCLOAK_REDIRECT_URI', 'https://localhost:8080')
    vi.stubEnv('ADMIN_KC_USER_ID', 'a,b , c')
    vi.stubEnv('KEYCLOAK_PROTOCOL', 'https')
    expect(keycloakConfigFactory().url).toBe('https://kc.example.com')
    expect(keycloakConfigFactory().protocol).toBe('https')
  })

  it('throws when a required var is missing', () => {
    expect(() => keycloakConfigFactory()).toThrow()
  })
})
