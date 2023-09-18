import * as dotenv from 'dotenv'
import { removeTrailingSlash } from '@dso-console/shared'

dotenv.config({ path: '/env/.env' })

// application mode
export const isDev = process.env.NODE_ENV === 'development'
export const isTest = process.env.NODE_ENV === 'test'
export const isProd = process.env.NODE_ENV === 'production'
export const isInt = process.env.INTEGRATION === 'true'
export const isCI = process.env.CI === 'true'
export const isDevSetup = process.env.DEV_SETUP === 'true'

// app
export const port = process.env.SERVER_PORT

// db
export const dbUrl = process.env.DB_URL

// keycloak
export const sessionSecret = process.env.SESSION_SECRET
export const keycloakProtocol = process.env.KEYCLOAK_PROTOCOL
export const keycloakDomain = process.env.KEYCLOAK_DOMAIN
export const keycloakRealm = process.env.KEYCLOAK_REALM
export const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID
export const keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET
export const keycloakRedirectUri = process.env.KEYCLOAK_REDIRECT_URI
export const adminsUserId = process.env.ADMIN_KC_USER_ID ? process.env.ADMIN_KC_USER_ID.split(',') : []

// keycloak plugin
export const keycloakToken = process.env.KEYCLOAK_ADMIN_PASSWORD
export const keycloakUser = process.env.KEYCLOAK_ADMIN

// services url
export const vaultUrl = removeTrailingSlash(process.env.VAULT_URL)
export const nexusUrl = removeTrailingSlash(process.env.NEXUS_URL)
export const gitlabUrl = removeTrailingSlash(process.env.GITLAB_URL)
export const sonarqubeUrl = removeTrailingSlash(process.env.SONARQUBE_URL)
export const harborUrl = removeTrailingSlash(process.env.HARBOR_URL)
export const argocdUrl = removeTrailingSlash(process.env.ARGOCD_URL)

// plugins
export const mockPlugins = process.env.MOCK_PLUGINS === 'true'
export const projectRootDir = process.env.PROJECTS_ROOT_DIR
export const disabledPlugins = process.env.DISABLED_PLUGINS ? process.env.DISABLED_PLUGINS.split(',') : []

// gitlab plugin
export const gitlabToken = process.env.GITLAB_TOKEN

// nexus plugin
export const nexusUser = process.env.NEXUS_ADMIN
export const nexusPassword = process.env.NEXUS_ADMIN_PASSWORD

// sonarqube plugin
export const sonarqubeApiToken = process.env.SONAR_API_TOKEN

// vault plugin
export const vaultToken = process.env.VAULT_TOKEN

// harbor plugin
export const harborUser = process.env.HARBOR_ADMIN
export const harborPassword = process.env.HARBOR_ADMIN_PASSWORD

// kubernetes plugin
export const kubeconfigCtx = process.env.KUBECONFIG_CTX
export const kubeconfigPath = process.env.KUBECONFIG_PATH

// argo plugin
export const argoNamespace = process.env.ARGO_NAMESPACE
