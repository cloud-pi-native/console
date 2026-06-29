import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigurationService } from './configuration.service'

describe('configurationService', () => {
  let service: ConfigurationService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()

    // KEYCLOAK_PUBLIC_PROTOCOL and KEYCLOAK_PUBLIC_DOMAIN are intentionally absent for these tests
    vi.stubEnv('KEYCLOAK_PROTOCOL', 'http')
    vi.stubEnv('KEYCLOAK_DOMAIN', 'keycloak.example.com')
    vi.stubEnv('KEYCLOAK_REALM', 'cloud-pi-native')
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigurationService],
    }).compile()

    service = module.get<ConfigurationService>(ConfigurationService)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should derive Keycloak issuer from internal configuration', () => {
    expect(service.getKeycloakIssuer()).toBe(
      'http://keycloak.example.com/realms/cloud-pi-native',
    )
  })

  it('should expose openid-configuration cache TTL', () => {
    expect(service.keycloakOpenidConfigurationCacheTtlMs).toBe(300_000)
  })

  it('should use public protocol and domain for issuer when set', () => {
    service.keycloakPublicProtocol = 'https'
    service.keycloakPublicDomain = 'keycloak.public.example.fr'
    expect(service.getKeycloakIssuer()).toBe(
      'https://keycloak.public.example.fr/realms/cloud-pi-native',
    )
    expect(service.getPublicKeycloakUrl()).toBe(
      'https://keycloak.public.example.fr',
    )
  })

  it('should fall back to internal protocol and domain when public are not set', () => {
    service.keycloakPublicProtocol = undefined
    service.keycloakPublicDomain = undefined
    expect(service.getKeycloakIssuer()).toBe(
      'http://keycloak.example.com/realms/cloud-pi-native',
    )
    expect(service.getPublicKeycloakUrl()).toBe(
      'http://keycloak.example.com',
    )
  })

  it('should throw when Keycloak protocol or domain is missing', () => {
    service.keycloakProtocol = ''
    service.keycloakDomain = 'keycloak.example.com'
    expect(() => service.getKeycloakIssuer()).toThrow(
      'Keycloak protocol is not configured.',
    )
    expect(() => service.getKeycloakUrl()).toThrow(
      'Keycloak protocol or domain is not configured.',
    )

    service.keycloakProtocol = 'http'
    service.keycloakDomain = ''
    expect(() => service.getKeycloakIssuer()).toThrow(
      'Keycloak domain is not configured.',
    )
    expect(() => service.getKeycloakUrl()).toThrow(
      'Keycloak protocol or domain is not configured.',
    )
  })
})
