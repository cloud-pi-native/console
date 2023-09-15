import * as dotenv from 'dotenv'

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

// plugins
export const mockPlugins = process.env.MOCK_PLUGINS === 'true'
export const projectRootDir = process.env.PROJECTS_ROOT_DIR
export const disabledPlugins = process.env.DISABLED_PLUGINS ? process.env.DISABLED_PLUGINS.split(',') : []

// kubernetes plugin
export const kubeconfigCtx = process.env.KUBECONFIG_CTX
export const kubeconfigPath = process.env.KUBECONFIG_PATH
