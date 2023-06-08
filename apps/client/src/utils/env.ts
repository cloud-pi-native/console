export const serverHost = process.env.SERVER_HOST as string || 'server-host'

export const serverPort = process.env.SERVER_PORT as string || 'server-port'

export const clientPort = process.env.CLIENT_PORT as string || 'client-port'

export const keycloakProtocol = process.env.KEYCLOAK_PROTOCOL as string || 'keycloak-protocol'

export const keycloakDomain = process.env.KEYCLOAK_DOMAIN as string || 'keycloak-domain'

export const keycloakRealm = process.env.KEYCLOAK_REALM as string || 'keycloak-realm'

export const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID as string || 'keycloak-client-id'

export const keycloakRedirectUri = process.env.KEYCLOAK_REDIRECT_URI as string || 'keycloak-redirect-uri'
