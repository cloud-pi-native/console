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
  keycloakRedirectUri = process.env.KEYCLOAK_REDIRECT_URI
  keycloakControllerPurgeOrphans = Boolean(process.env.KEYCLOAK_RECONCILER_PURGE_ORPHANS)
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
  projectRootDir = process.env.PROJECTS_ROOT_DIR
  pluginsDir = process.env.PLUGINS_DIR ?? '/plugins'

  // gitlab
  gitlabToken = process.env.GITLAB_TOKEN
  gitlabUrl = process.env.GITLAB_URL
  gitlabInternalUrl = process.env.GITLAB_INTERNAL_URL
    ? process.env.GITLAB_INTERNAL_URL
    : process.env.GITLAB_URL

  // vault
  vaultToken = process.env.VAULT_TOKEN
  vaultUrl = process.env.VAULT_URL
  vaultInternalUrl = process.env.VAULT_INTERNAL_URL
    ? process.env.VAULT_INTERNAL_URL
    : process.env.VAULT_URL
  vaultKvName = process.env.VAULT_KV_NAME ?? 'forge-dso'

  NODE_ENV
    = process.env.NODE_ENV === 'test'
      ? 'test'
      : process.env.NODE_ENV === 'development'
        ? 'development'
        : 'production'
}
