import * as dotenv from 'dotenv'

dotenv.config()

export const isDev = process.env.NODE_ENV === 'development'

export const isTest = process.env.NODE_ENV === 'test'

export const isProd = process.env.NODE_ENV === 'production'

export const isCI = process.env.CI === 'true'

export const isDevSetup = process.env.DEV_SETUP === 'true'

export const port = process.env.SERVER_PORT

export const dbHost = process.env.DB_HOST

export const dbPort = process.env.DB_PORT

export const dbUser = process.env.DB_USER

export const dbPass = process.env.DB_PASS

export const dbName = process.env.DB_NAME

export const sessionSecret = process.env.SESSION_SECRET

export const keycloakProtocol = process.env.KEYCLOAK_PROTOCOL

export const keycloakDomain = process.env.KEYCLOAK_DOMAIN

export const keycloakRealm = process.env.KEYCLOAK_REALM

export const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID

export const keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET

export const adminsUserId = process.env.ADMIN_KC_USER_ID ? process.env.ADMIN_KC_USER_ID.split(',') : []

export const encryptionKey = process.env.ENCRYPTION_KEY

export const argocdUrl = process.env.ARGOCD_URL

export const gitlabUrl = process.env.GITLAB_URL
export const gitlabToken = process.env.GITLAB_TOKEN

export const nexusUrl = process.env.NEXUS_URL

export const quayUrl = process.env.QUAY_URL

export const sonarqubeUrl = process.env.SONARQUBE_URL
export const sonarqubeApiUrl = process.env.SONAR_API_URL
export const sonarqubeApiToken = process.env.SONAR_API_TOKEN

export const vaultUrl = process.env.VAULT_URL
export const vaultToken = process.env.VAULT_TOKEN

export const harborUrl = process.env.HARBOR_API_URL
export const harborUser = process.env.HARBOR_ADMIN
export const harborPassword = process.env.HARBOR_PASSWORD

export const projectPath = process.env.PROJECT_PATH?.split('/') || ['forge-mi', 'projects']

export const mockPlugins = process.env.MOCK_PLUGINS === 'true'
