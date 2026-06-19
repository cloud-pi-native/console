import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name)

  // application mode
  isDev = process.env.NODE_ENV === 'development'
  isTest = process.env.NODE_ENV === 'test'
  isProd = process.env.NODE_ENV === 'production'
  isInt = process.env.INTEGRATION === 'true'
  isCI = process.env.CI === 'true'
  isDevSetup = process.env.DEV_SETUP === 'true'

  // app
  host = process.env.SERVER_HOST ?? 'localhost'
  port = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 0 // dynamically allocate an available ephemeral port
  appVersion = this.isProd ? (process.env.APP_VERSION ?? 'unknown') : 'dev'

  // db
  dbUrl = process.env.DB_URL

  // keycloak
  sessionSecret = process.env.SESSION_SECRET
  keycloakProtocol = process.env.KEYCLOAK_PROTOCOL
  keycloakDomain = process.env.KEYCLOAK_DOMAIN
  keycloakPublicProtocol = process.env.KEYCLOAK_PUBLIC_PROTOCOL
  keycloakPublicDomain = process.env.KEYCLOAK_PUBLIC_DOMAIN
  keycloakRealm = process.env.KEYCLOAK_REALM
  keycloakClientId = process.env.KEYCLOAK_CLIENT_ID
  keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET
  keycloakAdmin = process.env.KEYCLOAK_ADMIN
  keycloakAdminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD
  keycloakRedirectUri = process.env.KEYCLOAK_REDIRECT_URI

  // JWKS cache TTL in ms (default 5 min); Keycloak rotates keys periodically
  keycloakJwksCacheTtlMs = Number(process.env.KEYCLOAK_JWKS_CACHE_TTL_MS ?? 300_000)
  // JWKS fetch timeout in ms (default 1 s); avoids hanging on cache misses
  keycloakJwksTimeoutMs = Number(process.env.KEYCLOAK_JWKS_TIMEOUT_MS ?? 1_000)

  adminsUserId = process.env.ADMIN_KC_USER_ID
    ? process.env.ADMIN_KC_USER_ID.split(',')
    : []

  contactEmail
    = process.env.CONTACT_EMAIL
      ?? 'cloudpinative-relations@interieur.gouv.fr'

  // argocd
  argoNamespace = process.env.ARGO_NAMESPACE ?? 'argocd'
  argocdUrl = process.env.ARGOCD_URL
  argocdExtraRepositories = process.env.ARGOCD_EXTRA_REPOSITORIES

  // dso
  dsoEnvChartVersion = process.env.DSO_ENV_CHART_VERSION ?? 'dso-env-1.6.0'
  dsoNsChartVersion = process.env.DSO_NS_CHART_VERSION ?? 'dso-ns-1.1.5'

  // opencds
  openCdsUrl = process.env.OPENCDS_URL
  openCdsApiToken = process.env.OPENCDS_API_TOKEN
  openCdsApiTlsRejectUnauthorized = process.env.OPENCDS_API_TLS_REJECT_UNAUTHORIZED !== 'false'

  // plugins
  mockPlugins = process.env.MOCK_PLUGINS === 'true'
  projectRootDir = process.env.PROJECTS_ROOT_DIR
  pluginsDir = process.env.PLUGINS_DIR ?? '/plugins'

  // gitlab
  gitlabToken = process.env.GITLAB_TOKEN
  gitlabUrl = process.env.GITLAB_URL
  gitlabInternalUrl = process.env.GITLAB_INTERNAL_URL

  gitlabMirrorTokenExpirationDays = Number(process.env.GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS ?? 180)
  gitlabMirrorTokenRotationThresholdDays = Number(process.env.GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS ?? 90)

  // vault
  vaultToken = process.env.VAULT_TOKEN
  vaultUrl = process.env.VAULT_URL
  vaultInternalUrl = process.env.VAULT_INTERNAL_URL

  vaultKvName = process.env.VAULT_KV_NAME ?? 'forge-dso'

  // registry (harbor)
  harborUrl = process.env.HARBOR_URL
  harborInternalUrl = process.env.HARBOR_INTERNAL_URL
  harborAdmin = process.env.HARBOR_ADMIN
  harborAdminPassword = process.env.HARBOR_ADMIN_PASSWORD
  harborRuleTemplate = process.env.HARBOR_RULE_TEMPLATE
  harborRuleCount = process.env.HARBOR_RULE_COUNT
  harborRetentionCron = process.env.HARBOR_RETENTION_CRON ?? '0 22 2 * * *'
  harborRobotRotationThresholdDays = Number(process.env.HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS ?? 90)

  // nexus
  nexusUrl = process.env.NEXUS_URL
  nexusInternalUrl = process.env.NEXUS_INTERNAL_URL
  nexusAdmin = process.env.NEXUS_ADMIN
  nexusAdminPassword = process.env.NEXUS_ADMIN_PASSWORD
  nexusSecretExposedUrl
    = process.env.NEXUS__SECRET_EXPOSE_INTERNAL_URL === 'true'
      ? process.env.NEXUS_INTERNAL_URL
      : process.env.NEXUS_URL

  // sonarqube
  sonarqubeUrl = process.env.SONARQUBE_URL
  sonarqubeInternalUrl = process.env.SONARQUBE_INTERNAL_URL
  sonarApiToken = process.env.SONAR_API_TOKEN

  getKeycloakIssuer() {
    const protocol = this.keycloakPublicProtocol ?? this.keycloakProtocol
    const domain = this.keycloakPublicDomain ?? this.keycloakDomain
    const issuer = `${protocol}://${domain}/realms/${this.keycloakRealm}`
    this.logger.log(`Keycloak issuer resolved: ${issuer}`)
    return issuer
  }

  getKeycloakCertsUrl() {
    const url = `${this.getKeycloakIssuer()}/protocol/openid-connect/certs`
    this.logger.log(`Keycloak certs URL resolved: ${url}`)
    return url
  }

  getKeycloakOpenidConfigurationUrl() {
    const url = `${this.getKeycloakUrl()}/realms/${this.keycloakRealm}/.well-known/openid-configuration`
    this.logger.log(`Keycloak openid-configuration URL resolved: ${url}`)
    return url
  }

  getPublicKeycloakUrl() {
    const protocol = this.keycloakPublicProtocol ?? this.keycloakProtocol
    this.logger.log(`Keycloak public protocol resolved: ${protocol} (${this.keycloakPublicProtocol ? 'public' : 'internal'})`)
    const domain = this.keycloakPublicDomain ?? this.keycloakDomain
    this.logger.log(`Keycloak public domain resolved: ${domain} (${this.keycloakPublicDomain ? 'public' : 'internal'})`)
    const url = `${protocol}://${domain}`
    this.logger.log(`Keycloak public URL resolved: ${url}`)
    return url
  }

  getKeycloakUrl() {
    const url = `${this.keycloakProtocol}://${this.keycloakDomain}`
    this.logger.log(`Keycloak internal URL resolved: ${url}`)
    return url
  }

  getInternalOrPublicGitlabUrl() {
    const url = this.gitlabInternalUrl ?? this.gitlabUrl
    this.logger.log(`GitLab URL resolved: ${url} (${this.gitlabInternalUrl ? 'internal' : 'public'})`)
    return url
  }

  getInternalOrPublicVaultUrl() {
    const url = this.vaultInternalUrl ?? this.vaultUrl
    this.logger.log(`Vault URL resolved: ${url} (${this.vaultInternalUrl ? 'internal' : 'public'})`)
    return url
  }

  getInternalOrPublicHarborUrl() {
    const url = this.harborInternalUrl ?? this.harborUrl
    this.logger.log(`Harbor URL resolved: ${url} (${this.harborInternalUrl ? 'internal' : 'public'})`)
    return url
  }

  getInternalOrPublicNexusUrl() {
    const url = this.nexusInternalUrl ?? this.nexusUrl
    this.logger.log(`Nexus URL resolved: ${url} (${this.nexusInternalUrl ? 'internal' : 'public'})`)
    return url
  }

  getInternalOrPublicSonarqubeUrl() {
    const url = this.sonarqubeInternalUrl ?? this.sonarqubeUrl
    this.logger.log(`SonarQube URL resolved: ${url} (${this.sonarqubeInternalUrl ? 'internal' : 'public'})`)
    return url
  }

  NODE_ENV
    = process.env.NODE_ENV === 'test'
      ? 'test'
      : process.env.NODE_ENV === 'development'
        ? 'development'
        : 'production'
}
