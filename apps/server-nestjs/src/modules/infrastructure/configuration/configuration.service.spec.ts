import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigurationService } from './configuration.service'

async function buildService(): Promise<ConfigurationService> {
  return Test.createTestingModule({
    providers: [ConfigurationService],
  })
    .compile()
    .then(module => module.get<ConfigurationService>(ConfigurationService))
}

describe('ConfigurationService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('application mode flags', () => {
    it('should default all boolean flags to false when env is unset', async () => {
      vi.stubEnv('NODE_ENV', '')
      const service = await buildService()
      expect(service.isDev).toBe(false)
      expect(service.isTest).toBe(false)
      expect(service.isProd).toBe(false)
      expect(service.isInt).toBe(false)
      expect(service.isCI).toBe(false)
      expect(service.isDevSetup).toBe(false)
    })

    it('should set isDev when NODE_ENV=development', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      const service = await buildService()
      expect(service.isDev).toBe(true)
      expect(service.isTest).toBe(false)
      expect(service.isProd).toBe(false)
    })

    it('should set isTest when NODE_ENV=test', async () => {
      vi.stubEnv('NODE_ENV', 'test')
      const service = await buildService()
      expect(service.isDev).toBe(false)
      expect(service.isTest).toBe(true)
      expect(service.isProd).toBe(false)
    })

    it('should set isProd when NODE_ENV=production', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      const service = await buildService()
      expect(service.isDev).toBe(false)
      expect(service.isTest).toBe(false)
      expect(service.isProd).toBe(true)
    })

    it('should set isInt when INTEGRATION=true', async () => {
      vi.stubEnv('INTEGRATION', 'true')
      const service = await buildService()
      expect(service.isInt).toBe(true)
    })

    it('should set isCI when CI=true', async () => {
      vi.stubEnv('CI', 'true')
      const service = await buildService()
      expect(service.isCI).toBe(true)
    })

    it('should set isDevSetup when DEV_SETUP=true', async () => {
      vi.stubEnv('DEV_SETUP', 'true')
      const service = await buildService()
      expect(service.isDevSetup).toBe(true)
    })
  })

  describe('app config', () => {
    it('should default host to localhost and port to zero when env is unset', async () => {
      const service = await buildService()
      expect(service.host).toBe('localhost')
      expect(service.port).toBe(0)
    })

    it('should read SERVER_HOST and SERVER_PORT from env', async () => {
      vi.stubEnv('SERVER_HOST', '0.0.0.0')
      vi.stubEnv('SERVER_PORT', '4000')
      const service = await buildService()
      expect(service.host).toBe('0.0.0.0')
      expect(service.port).toBe(4000)
    })

    it('should set appVersion to "dev" when not in production', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('APP_VERSION', '1.2.3')
      const service = await buildService()
      expect(service.appVersion).toBe('dev')
    })

    it('should fall back to "unknown" for appVersion when APP_VERSION is unset in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('APP_VERSION', '1.2.3')
      expect((await buildService()).appVersion).toBe('1.2.3')

      vi.unstubAllEnvs()
      vi.stubEnv('NODE_ENV', 'production')
      expect((await buildService()).appVersion).toBe('unknown')
    })
  })

  describe('database config', () => {
    it('should expose dbUrl as undefined when unset', async () => {
      const service = await buildService()
      expect(service.dbUrl).toBeUndefined()
    })

    it('should read DB_URL from env', async () => {
      vi.stubEnv('DB_URL', 'postgresql://user:pass@localhost:5432/db')
      const service = await buildService()
      expect(service.dbUrl).toBe('postgresql://user:pass@localhost:5432/db')
    })
  })

  describe('keycloak config', () => {
    let service: ConfigurationService

    beforeEach(async () => {
      vi.stubEnv('KEYCLOAK_PROTOCOL', 'http')
      vi.stubEnv('KEYCLOAK_DOMAIN', 'keycloak.example.com')
      vi.stubEnv('KEYCLOAK_REALM', 'cloud-pi-native')
      service = await buildService()
    })

    it('should read keycloak fields from env', () => {
      expect(service.keycloakProtocol).toBe('http')
      expect(service.keycloakDomain).toBe('keycloak.example.com')
      expect(service.keycloakRealm).toBe('cloud-pi-native')
      expect(service.keycloakClientId).toBeUndefined()
      expect(service.keycloakClientSecret).toBeUndefined()
      expect(service.keycloakAdmin).toBeUndefined()
      expect(service.keycloakAdminPassword).toBeUndefined()
      expect(service.keycloakRedirectUri).toBeUndefined()
    })

    it('should apply default numeric JWKS cache values when env is unset', () => {
      expect(service.keycloakJwksCacheTtlMs).toBe(300_000)
      expect(service.keycloakJwksTimeoutMs).toBe(5_000)
      expect(service.keycloakOpenidConfigurationCacheTtlMs).toBe(300_000)
    })

    it('should read JWKS-related numeric values from env', async () => {
      vi.stubEnv('KEYCLOAK_JWKS_CACHE_TTL_MS', '60000')
      vi.stubEnv('KEYCLOAK_JWKS_TIMEOUT_MS', '1000')
      vi.stubEnv('KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS', '120000')
      const custom = await buildService()
      expect(custom.keycloakJwksCacheTtlMs).toBe(60_000)
      expect(custom.keycloakJwksTimeoutMs).toBe(1_000)
      expect(custom.keycloakOpenidConfigurationCacheTtlMs).toBe(120_000)
    })

    it('should split ADMIN_KC_USER_ID into an array of ids', async () => {
      vi.stubEnv('ADMIN_KC_USER_ID', 'alice,bob,carol')
      const custom = await buildService()
      expect(custom.adminsUserId).toEqual(['alice', 'bob', 'carol'])
    })

    it('should default adminsUserId to an empty array when unset', () => {
      expect(service.adminsUserId).toEqual([])
    })

    it('should derive Keycloak internal URL from protocol and domain', () => {
      expect(service.getKeycloakUrl()).toBe('http://keycloak.example.com')
    })

    it('should derive the keycloak realm URL from internal URL', () => {
      expect(service.getKeycloakRealmUrl()).toBe(
        'http://keycloak.example.com/realms/cloud-pi-native',
      )
    })

    it('should derive the openid-configuration URL from the realm URL', () => {
      expect(service.getKeycloakOpenidConfigurationUrl()).toBe(
        'http://keycloak.example.com/realms/cloud-pi-native/.well-known/openid-configuration',
      )
    })

    it('should use public protocol and domain for public URL when set', async () => {
      vi.stubEnv('KEYCLOAK_PUBLIC_PROTOCOL', 'https')
      vi.stubEnv('KEYCLOAK_PUBLIC_DOMAIN', 'keycloak.public.example.fr')
      const custom = await buildService()
      expect(custom.getPublicKeycloakUrl()).toBe('https://keycloak.public.example.fr')
    })

    it('should fall back to internal protocol and domain for public URL when public are not set', () => {
      expect(service.getPublicKeycloakUrl()).toBe('http://keycloak.example.com')
    })

    it('should derive the public realm URL', async () => {
      vi.stubEnv('KEYCLOAK_PUBLIC_PROTOCOL', 'https')
      vi.stubEnv('KEYCLOAK_PUBLIC_DOMAIN', 'keycloak.public.example.fr')
      const custom = await buildService()
      expect(custom.getPublicKeycloakRealmUrl()).toBe(
        'https://keycloak.public.example.fr/realms/cloud-pi-native',
      )
    })

    it('should throw when Keycloak protocol or domain is missing for internal URL', () => {
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

    it('should throw when public keycloak domain is missing but protocol is set', () => {
      service.keycloakPublicProtocol = 'https'
      service.keycloakPublicDomain = undefined
      service.keycloakProtocol = ''
      service.keycloakDomain = ''
      expect(() => service.getPublicKeycloakUrl()).toThrow(
        /domain is not configured/,
      )
    })

    it('should throw when public keycloak protocol is missing but domain is set', () => {
      service.keycloakPublicProtocol = undefined
      service.keycloakPublicDomain = 'public.example.fr'
      service.keycloakProtocol = ''
      service.keycloakDomain = ''
      expect(() => service.getPublicKeycloakUrl()).toThrow(
        /protocol is not configured/,
      )
    })
  })

  describe('contact email', () => {
    it('should default contactEmail to the official relations address when unset', async () => {
      const service = await buildService()
      expect(service.contactEmail).toBe('cloudpinative-relations@interieur.gouv.fr')
    })

    it('should read CONTACT_EMAIL from env', async () => {
      vi.stubEnv('CONTACT_EMAIL', 'ops@example.fr')
      const service = await buildService()
      expect(service.contactEmail).toBe('ops@example.fr')
    })
  })

  describe('argocd config', () => {
    it('should default argoNamespace to argocd and leave other fields unset', async () => {
      const service = await buildService()
      expect(service.argoNamespace).toBe('argocd')
      expect(service.argocdUrl).toBeUndefined()
      expect(service.argocdExtraRepositories).toBeUndefined()
    })

    it('should read argocd fields from env', async () => {
      vi.stubEnv('ARGO_NAMESPACE', 'custom-argocd')
      vi.stubEnv('ARGOCD_URL', 'https://argocd.internal')
      vi.stubEnv('ARGOCD_EXTRA_REPOSITORIES', 'https://extra.git')
      const service = await buildService()
      expect(service.argoNamespace).toBe('custom-argocd')
      expect(service.argocdUrl).toBe('https://argocd.internal')
      expect(service.argocdExtraRepositories).toBe('https://extra.git')
    })
  })

  describe('dso config', () => {
    it('should default dso chart versions when env is unset', async () => {
      const service = await buildService()
      expect(service.dsoEnvChartVersion).toBe('dso-env-1.6.0')
      expect(service.dsoNsChartVersion).toBe('dso-ns-1.1.5')
    })

    it('should read DSO chart versions from env', async () => {
      vi.stubEnv('DSO_ENV_CHART_VERSION', 'dso-env-2.0.0')
      vi.stubEnv('DSO_NS_CHART_VERSION', 'dso-ns-2.0.0')
      const service = await buildService()
      expect(service.dsoEnvChartVersion).toBe('dso-env-2.0.0')
      expect(service.dsoNsChartVersion).toBe('dso-ns-2.0.0')
    })
  })

  describe('opencds config', () => {
    it('should default openCdsApiTlsRejectUnauthorized to true when unset', async () => {
      const service = await buildService()
      expect(service.openCdsUrl).toBeUndefined()
      expect(service.openCdsApiToken).toBeUndefined()
      expect(service.openCdsApiTlsRejectUnauthorized).toBe(true)
    })

    it('should allow opting out of TLS verification', async () => {
      vi.stubEnv('OPENCDS_API_TLS_REJECT_UNAUTHORIZED', 'false')
      const service = await buildService()
      expect(service.openCdsApiTlsRejectUnauthorized).toBe(false)
    })

    it('should read OPENCDS fields from env', async () => {
      vi.stubEnv('OPENCDS_URL', 'https://open-cds.internal')
      vi.stubEnv('OPENCDS_API_TOKEN', 'opencds-token')
      const service = await buildService()
      expect(service.openCdsUrl).toBe('https://open-cds.internal')
      expect(service.openCdsApiToken).toBe('opencds-token')
    })
  })

  describe('plugins config', () => {
    it('should default pluginsDir to /plugins and mockPlugins to false', async () => {
      const service = await buildService()
      expect(service.pluginsDir).toBe('/plugins')
      expect(service.projectRootDir).toBeUndefined()
      expect(service.mockPlugins).toBe(false)
    })

    it('should read plugin-related fields from env', async () => {
      vi.stubEnv('PLUGINS_DIR', '/opt/plugins')
      vi.stubEnv('PROJECTS_ROOT_DIR', '/data/projects')
      vi.stubEnv('MOCK_PLUGINS', 'true')
      const service = await buildService()
      expect(service.pluginsDir).toBe('/opt/plugins')
      expect(service.projectRootDir).toBe('/data/projects')
      expect(service.mockPlugins).toBe(true)
    })
  })

  describe('gitlab config', () => {
    it('should default rotation numeric values when env is unset', async () => {
      const service = await buildService()
      expect(service.gitlabMirrorTokenExpirationDays).toBe(180)
      expect(service.gitlabMirrorTokenRotationThresholdDays).toBe(90)
    })

    it('should read gitlab fields from env', async () => {
      vi.stubEnv('GITLAB_TOKEN', 'glpat-xyz')
      vi.stubEnv('GITLAB_URL', 'https://gitlab.public')
      vi.stubEnv('GITLAB_INTERNAL_URL', 'http://gitlab.internal')
      vi.stubEnv('GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS', '360')
      vi.stubEnv('GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS', '180')
      const service = await buildService()
      expect(service.gitlabToken).toBe('glpat-xyz')
      expect(service.gitlabUrl).toBe('https://gitlab.public')
      expect(service.gitlabInternalUrl).toBe('http://gitlab.internal')
      expect(service.gitlabMirrorTokenExpirationDays).toBe(360)
      expect(service.gitlabMirrorTokenRotationThresholdDays).toBe(180)
    })

    it('should prefer internal over public GitLab URL', async () => {
      vi.stubEnv('GITLAB_URL', 'https://gitlab.public')
      vi.stubEnv('GITLAB_INTERNAL_URL', 'http://gitlab.internal')
      const service = await buildService()
      expect(service.getInternalOrPublicGitlabUrl()).toBe('http://gitlab.internal')
    })

    it('should fall back to public GitLab URL when internal is unset', async () => {
      vi.stubEnv('GITLAB_URL', 'https://gitlab.public')
      const service = await buildService()
      expect(service.getInternalOrPublicGitlabUrl()).toBe('https://gitlab.public')
    })

    it('should return undefined when both internal and public GitLab URLs are unset', async () => {
      const service = await buildService()
      expect(service.getInternalOrPublicGitlabUrl()).toBeUndefined()
    })
  })

  describe('vault config', () => {
    it('should default vaultKvName to forge-dso', async () => {
      const service = await buildService()
      expect(service.vaultKvName).toBe('forge-dso')
    })

    it('should read vault fields from env', async () => {
      vi.stubEnv('VAULT_TOKEN', 'vault-token')
      vi.stubEnv('VAULT_URL', 'https://vault.public')
      vi.stubEnv('VAULT_INTERNAL_URL', 'http://vault.internal')
      vi.stubEnv('VAULT_KV_NAME', 'custom-kv')
      const service = await buildService()
      expect(service.vaultToken).toBe('vault-token')
      expect(service.vaultUrl).toBe('https://vault.public')
      expect(service.vaultInternalUrl).toBe('http://vault.internal')
      expect(service.vaultKvName).toBe('custom-kv')
    })

    it('should prefer internal over public Vault URL', async () => {
      vi.stubEnv('VAULT_URL', 'https://vault.public')
      vi.stubEnv('VAULT_INTERNAL_URL', 'http://vault.internal')
      const service = await buildService()
      expect(service.getInternalOrPublicVaultUrl()).toBe('http://vault.internal')
    })

    it('should fall back to public Vault URL when internal is unset', async () => {
      vi.stubEnv('VAULT_URL', 'https://vault.public')
      const service = await buildService()
      expect(service.getInternalOrPublicVaultUrl()).toBe('https://vault.public')
    })

    it('should return undefined when both internal and public Vault URLs are unset', async () => {
      const service = await buildService()
      expect(service.getInternalOrPublicVaultUrl()).toBeUndefined()
    })
  })

  describe('harbor config (registry)', () => {
    it('should default harbor numeric and cron fields when unset', async () => {
      const service = await buildService()
      expect(service.harborRetentionCron).toBe('0 22 2 * * *')
      expect(service.harborRobotRotationThresholdDays).toBe(90)
      expect(service.harborProjectSlugCacheTtlMs).toBe(300_000)
    })

    it('should read harbor fields from env', async () => {
      vi.stubEnv('HARBOR_URL', 'https://harbor.public')
      vi.stubEnv('HARBOR_INTERNAL_URL', 'http://harbor.internal')
      vi.stubEnv('HARBOR_ADMIN', 'admin')
      vi.stubEnv('HARBOR_ADMIN_PASSWORD', 'harbor-password')
      vi.stubEnv('HARBOR_RULE_TEMPLATE', 'template')
      vi.stubEnv('HARBOR_RULE_COUNT', '5')
      vi.stubEnv('HARBOR_RETENTION_CRON', '0 0 * * *')
      vi.stubEnv('HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS', '30')
      vi.stubEnv('HARBOR_PROJECT_SLUG_CACHE_TTL_MS', '60000')
      const service = await buildService()
      expect(service.harborUrl).toBe('https://harbor.public')
      expect(service.harborInternalUrl).toBe('http://harbor.internal')
      expect(service.harborAdmin).toBe('admin')
      expect(service.harborAdminPassword).toBe('harbor-password')
      expect(service.harborRuleTemplate).toBe('template')
      expect(service.harborRuleCount).toBe('5')
      expect(service.harborRetentionCron).toBe('0 0 * * *')
      expect(service.harborRobotRotationThresholdDays).toBe(30)
      expect(service.harborProjectSlugCacheTtlMs).toBe(60_000)
    })

    it('should prefer internal over public Harbor URL', async () => {
      vi.stubEnv('HARBOR_URL', 'https://harbor.public')
      vi.stubEnv('HARBOR_INTERNAL_URL', 'http://harbor.internal')
      const service = await buildService()
      expect(service.getInternalOrPublicHarborUrl()).toBe('http://harbor.internal')
    })

    it('should fall back to public Harbor URL when internal is unset', async () => {
      vi.stubEnv('HARBOR_URL', 'https://harbor.public')
      const service = await buildService()
      expect(service.getInternalOrPublicHarborUrl()).toBe('https://harbor.public')
    })

    it('should return undefined when both internal and public Harbor URLs are unset', async () => {
      const service = await buildService()
      expect(service.getInternalOrPublicHarborUrl()).toBeUndefined()
    })
  })

  describe('nexus config', () => {
    it('should default nexusSecretExposedUrl to public url when the toggle is off', async () => {
      vi.stubEnv('NEXUS_URL', 'https://nexus.public')
      const service = await buildService()
      expect(service.nexusSecretExposedUrl).toBe('https://nexus.public')
    })

    it('should expose internal nexus url when the toggle is enabled', async () => {
      vi.stubEnv('NEXUS__SECRET_EXPOSE_INTERNAL_URL', 'true')
      vi.stubEnv('NEXUS_INTERNAL_URL', 'http://nexus.internal')
      vi.stubEnv('NEXUS_URL', 'https://nexus.public')
      const service = await buildService()
      expect(service.nexusSecretExposedUrl).toBe('http://nexus.internal')
    })

    it('should read nexus fields from env', async () => {
      vi.stubEnv('NEXUS_URL', 'https://nexus.public')
      vi.stubEnv('NEXUS_INTERNAL_URL', 'http://nexus.internal')
      vi.stubEnv('NEXUS_ADMIN', 'admin')
      vi.stubEnv('NEXUS_ADMIN_PASSWORD', 'nexus-password')
      const service = await buildService()
      expect(service.nexusUrl).toBe('https://nexus.public')
      expect(service.nexusInternalUrl).toBe('http://nexus.internal')
      expect(service.nexusAdmin).toBe('admin')
      expect(service.nexusAdminPassword).toBe('nexus-password')
    })

    it('should prefer internal over public Nexus URL', async () => {
      vi.stubEnv('NEXUS_URL', 'https://nexus.public')
      vi.stubEnv('NEXUS_INTERNAL_URL', 'http://nexus.internal')
      const service = await buildService()
      expect(service.getInternalOrPublicNexusUrl()).toBe('http://nexus.internal')
    })

    it('should fall back to public Nexus URL when internal is unset', async () => {
      vi.stubEnv('NEXUS_URL', 'https://nexus.public')
      const service = await buildService()
      expect(service.getInternalOrPublicNexusUrl()).toBe('https://nexus.public')
    })

    it('should return undefined when both internal and public Nexus URLs are unset', async () => {
      const service = await buildService()
      expect(service.getInternalOrPublicNexusUrl()).toBeUndefined()
    })
  })

  describe('sonarqube config', () => {
    it('should read sonarqube fields from env', async () => {
      vi.stubEnv('SONARQUBE_URL', 'https://sonar.public')
      vi.stubEnv('SONARQUBE_INTERNAL_URL', 'http://sonar.internal')
      vi.stubEnv('SONAR_API_TOKEN', 'sonar-token')
      const service = await buildService()
      expect(service.sonarqubeUrl).toBe('https://sonar.public')
      expect(service.sonarqubeInternalUrl).toBe('http://sonar.internal')
      expect(service.sonarApiToken).toBe('sonar-token')
    })

    it('should prefer internal over public SonarQube URL', async () => {
      vi.stubEnv('SONARQUBE_URL', 'https://sonar.public')
      vi.stubEnv('SONARQUBE_INTERNAL_URL', 'http://sonar.internal')
      const service = await buildService()
      expect(service.getInternalOrPublicSonarqubeUrl()).toBe('http://sonar.internal')
    })

    it('should fall back to public SonarQube URL when internal is unset', async () => {
      vi.stubEnv('SONARQUBE_URL', 'https://sonar.public')
      const service = await buildService()
      expect(service.getInternalOrPublicSonarqubeUrl()).toBe('https://sonar.public')
    })

    it('should return undefined when both internal and public SonarQube URLs are unset', async () => {
      const service = await buildService()
      expect(service.getInternalOrPublicSonarqubeUrl()).toBeUndefined()
    })
  })

  describe('NODE_ENV mapping', () => {
    it('should map NODE_ENV=test to "test"', async () => {
      vi.stubEnv('NODE_ENV', 'test')
      const service = await buildService()
      expect(service.NODE_ENV).toBe('test')
    })

    it('should map NODE_ENV=development to "development"', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      const service = await buildService()
      expect(service.NODE_ENV).toBe('development')
    })

    it('should map any other NODE_ENV to "production"', async () => {
      vi.stubEnv('NODE_ENV', 'staging')
      const service = await buildService()
      expect(service.NODE_ENV).toBe('production')
    })
  })
})
