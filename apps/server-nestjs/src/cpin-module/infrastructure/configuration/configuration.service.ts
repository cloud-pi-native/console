import { Injectable } from '@nestjs/common'

@Injectable()
export class ConfigurationService {
  // application mode
  isDev = process.env.NODE_ENV === 'development'
  isTest = process.env.NODE_ENV === 'test'
  isProd = process.env.NODE_ENV === 'production'
  isInt = process.env.INTEGRATION === 'true'
  isCI = process.env.CI === 'true'
  isDevSetup = process.env.DEV_SETUP === 'true'

  // app
  port = process.env.SERVER_PORT
  appVersion = this.isProd ? (process.env.APP_VERSION ?? 'unknown') : 'dev'

  // db
  dbUrl = process.env.DB_URL

  // keycloak
  sessionSecret = process.env.SESSION_SECRET
  keycloakProtocol = process.env.KEYCLOAK_PROTOCOL
  keycloakDomain = process.env.KEYCLOAK_DOMAIN
  keycloakRealm = process.env.KEYCLOAK_REALM
  keycloakClientId = process.env.KEYCLOAK_CLIENT_ID
  keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET
  keycloakAdmin = process.env.KEYCLOAK_ADMIN
  keycloakAdminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD
  keycloakRedirectUri = process.env.KEYCLOAK_REDIRECT_URI

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

  // plugins
  mockPlugins = process.env.MOCK_PLUGINS === 'true'
  projectRootPath = process.env.PROJECTS_ROOT_DIR
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
  harborRetentionCron = process.env.HARBOR_RETENTION_CRON

  // nexus
  nexusUrl = process.env.NEXUS_URL
  nexusInternalUrl = process.env.NEXUS_INTERNAL_URL
  nexusAdmin = process.env.NEXUS_ADMIN
  nexusAdminPassword = process.env.NEXUS_ADMIN_PASSWORD
  nexusSecretExposedUrl
    = process.env.NEXUS__SECRET_EXPOSE_INTERNAL_URL === 'true'
      ? process.env.NEXUS_INTERNAL_URL
      : process.env.NEXUS_URL

  getInternalOrPublicGitlabUrl() {
    return this.gitlabInternalUrl ?? this.gitlabUrl
  }

  getInternalOrPublicVaultUrl() {
    return this.vaultInternalUrl ?? this.vaultUrl
  }

  getInternalOrPublicHarborUrl() {
    return this.harborInternalUrl ?? this.harborUrl
  }

  getInternalOrPublicNexusUrl() {
    return this.nexusInternalUrl ?? this.nexusUrl
  }

  NODE_ENV
    = process.env.NODE_ENV === 'test'
      ? 'test'
      : process.env.NODE_ENV === 'development'
        ? 'development'
        : 'production'
}
