export const isDev = process.env.NODE_ENV === 'development'

export const isTest = process.env.NODE_ENV === 'test'

export const isProd = process.env.NODE_ENV === 'production'

export const isCI = process.env.CI === 'true'

export const playbookDir = process.env.PLAYBOOK_DIR?.endsWith('/')
  ? process.env.PLAYBOOK_DIR
  : process.env.PLAYBOOK_DIR + '/'

export const configDir = process.env.CONFIG_DIR?.endsWith('/')
  ? process.env.CONFIG_DIR
  : process.env.CONFIG_DIR + '/'

export const port = process.env.ANSIBLE_PORT

export const sessionSecret = process.env.SESSION_SECRET

export const keycloakProtocol = process.env.KEYCLOAK_PROTOCOL

export const keycloakDomain = process.env.KEYCLOAK_DOMAIN

export const keycloakRealm = process.env.KEYCLOAK_REALM

export const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID

export const keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET
