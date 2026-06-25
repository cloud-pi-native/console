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

  describe('keycloak URL derivation', () => {
    it('should derive the internal URL from protocol + domain', () => {
      expect(service.getKeycloakUrl()).toBe('http://keycloak.example.com')
    })

    it('should derive the realm URL from the internal URL', () => {
      expect(service.getKeycloakRealmUrl()).toBe(
        'http://keycloak.example.com/realms/cloud-pi-native',
      )
    })

    it('should derive the openid-configuration URL from the realm URL', () => {
      expect(service.getKeycloakOpenidConfigurationUrl()).toBe(
        'http://keycloak.example.com/realms/cloud-pi-native/.well-known/openid-configuration',
      )
    })

    it('should throw when Keycloak protocol or domain is missing', () => {
      service.keycloakProtocol = ''
      service.keycloakDomain = 'keycloak.example.com'
      expect(() => service.getKeycloakUrl()).toThrow(
        'Keycloak protocol or domain is not configured.',
      )
      expect(() => service.getKeycloakRealmUrl()).toThrow(
        'Keycloak protocol or domain is not configured.',
      )

      service.keycloakProtocol = 'http'
      service.keycloakDomain = ''
      expect(() => service.getKeycloakUrl()).toThrow(
        'Keycloak protocol or domain is not configured.',
      )
      expect(() => service.getKeycloakRealmUrl()).toThrow(
        'Keycloak protocol or domain is not configured.',
      )
    })
  })

  describe('internal-or-public URL helpers', () => {
    it('should prefer internal over public URL for GitLab, Vault, Harbor, Nexus, SonarQube', async () => {
      vi.stubEnv('GITLAB_URL', 'https://gitlab.public')
      vi.stubEnv('VAULT_URL', 'https://vault.public')
      vi.stubEnv('HARBOR_URL', 'https://harbor.public')
      vi.stubEnv('NEXUS_URL', 'https://nexus.public')
      vi.stubEnv('SONARQUBE_URL', 'https://sonar.public')
      vi.stubEnv('GITLAB_INTERNAL_URL', 'https://gitlab.internal')
      vi.stubEnv('VAULT_INTERNAL_URL', 'https://vault.internal')
      vi.stubEnv('HARBOR_INTERNAL_URL', 'https://harbor.internal')
      vi.stubEnv('NEXUS_INTERNAL_URL', 'https://nexus.internal')
      vi.stubEnv('SONARQUBE_INTERNAL_URL', 'https://sonar.internal')

      const testService = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))

      expect(testService.getInternalOrPublicGitlabUrl()).toBe('https://gitlab.internal')
      expect(testService.getInternalOrPublicVaultUrl()).toBe('https://vault.internal')
      expect(testService.getInternalOrPublicHarborUrl()).toBe('https://harbor.internal')
      expect(testService.getInternalOrPublicNexusUrl()).toBe('https://nexus.internal')
      expect(testService.getInternalOrPublicSonarqubeUrl()).toBe('https://sonar.internal')
    })

    it('should fall back to public URL for GitLab, Vault, Harbor, Nexus, SonarQube when internal is unset', async () => {
      vi.stubEnv('GITLAB_URL', 'https://gitlab.public')
      vi.stubEnv('GITLAB_INTERNAL_URL', '')
      vi.stubEnv('VAULT_URL', 'https://vault.public')
      vi.stubEnv('VAULT_INTERNAL_URL', '')
      vi.stubEnv('HARBOR_URL', 'https://harbor.public')
      vi.stubEnv('HARBOR_INTERNAL_URL', '')
      vi.stubEnv('NEXUS_URL', 'https://nexus.public')
      vi.stubEnv('NEXUS_INTERNAL_URL', '')
      vi.stubEnv('SONARQUBE_URL', 'https://sonar.public')
      vi.stubEnv('SONARQUBE_INTERNAL_URL', '')

      const testService = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))

      expect(testService.getInternalOrPublicGitlabUrl()).toBe('https://gitlab.public')
      expect(testService.getInternalOrPublicVaultUrl()).toBe('https://vault.public')
      expect(testService.getInternalOrPublicHarborUrl()).toBe('https://harbor.public')
      expect(testService.getInternalOrPublicNexusUrl()).toBe('https://nexus.public')
      expect(testService.getInternalOrPublicSonarqubeUrl()).toBe('https://sonar.public')
    })

    it('should return undefined for internal-or-public URL when neither side is configured', async () => {
      vi.stubEnv('GITLAB_URL', '')
      vi.stubEnv('GITLAB_INTERNAL_URL', '')
      vi.stubEnv('VAULT_URL', '')
      vi.stubEnv('VAULT_INTERNAL_URL', '')
      vi.stubEnv('HARBOR_URL', '')
      vi.stubEnv('HARBOR_INTERNAL_URL', '')
      vi.stubEnv('NEXUS_URL', '')
      vi.stubEnv('NEXUS_INTERNAL_URL', '')
      vi.stubEnv('SONARQUBE_URL', '')
      vi.stubEnv('SONARQUBE_INTERNAL_URL', '')

      const testService = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))

      expect(testService.getInternalOrPublicGitlabUrl()).toBeUndefined()
      expect(testService.getInternalOrPublicVaultUrl()).toBeUndefined()
      expect(testService.getInternalOrPublicHarborUrl()).toBeUndefined()
      expect(testService.getInternalOrPublicNexusUrl()).toBeUndefined()
      expect(testService.getInternalOrPublicSonarqubeUrl()).toBeUndefined()
    })
  })

  describe('conditional toggles and computed fields', () => {
    it('should default NODE_ENV to production and map explicit test/development values', async () => {
      vi.stubEnv('NODE_ENV', '')
      const testService = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(testService.NODE_ENV).toBe('production')
    })

    it('should map NODE_ENV=test to "test" and NODE_ENV=development to "development"', async () => {
      vi.stubEnv('NODE_ENV', 'test')
      const testService = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(testService.NODE_ENV).toBe('test')

      vi.stubEnv('NODE_ENV', 'development')
      const devService = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(devService.NODE_ENV).toBe('development')
    })

    it('should expose the requested app version in production, else "dev"', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('APP_VERSION', '1.2.3')
      const prod = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(prod.appVersion).toBe('1.2.3')

      vi.unstubAllEnvs()
      vi.stubEnv('NODE_ENV', 'production')
      const prodUnset = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(prodUnset.appVersion).toBe('unknown')

      vi.unstubAllEnvs()
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('APP_VERSION', '1.2.3')
      const dev = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(dev.appVersion).toBe('dev')
    })

    it('should expose nexusSecretExposedUrl based on the internal-url toggle', async () => {
      vi.stubEnv('NEXUS_URL', 'https://nexus.public')
      const off = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(off.nexusSecretExposedUrl).toBe('https://nexus.public')

      vi.stubEnv('NEXUS__SECRET_EXPOSE_INTERNAL_URL', 'true')
      vi.stubEnv('NEXUS_INTERNAL_URL', 'https://nexus.internal')
      const on = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(on.nexusSecretExposedUrl).toBe('https://nexus.internal')
    })

    it('should disable TLS verification for Open CDS only when explicitly set to false', async () => {
      vi.stubEnv('OPENCDS_API_TLS_REJECT_UNAUTHORIZED', '')

      const defaultService = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(defaultService.openCdsApiTlsRejectUnauthorized).toBe(true)

      vi.stubEnv('OPENCDS_API_TLS_REJECT_UNAUTHORIZED', 'false')
      const disabled = await Test.createTestingModule({
        providers: [ConfigurationService],
      }).compile().then(m => m.get<ConfigurationService>(ConfigurationService))
      expect(disabled.openCdsApiTlsRejectUnauthorized).toBe(false)
    })
  })
})
