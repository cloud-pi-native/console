export const serverHost: string = process.env.SERVER_HOST ?? 'dso-server-host'

export const serverPort: string = process.env.SERVER_PORT ?? 'dso-server-port'

export const clientPort: string = process.env.CLIENT_PORT ?? 'dso-client-port'

export const keycloakProtocol: string = process.env.KEYCLOAK_PROTOCOL ?? 'dso-keycloak-protocol'

export const keycloakDomain: string = process.env.KEYCLOAK_DOMAIN ?? 'dso-keycloak-domain'

export const keycloakRealm: string = process.env.KEYCLOAK_REALM ?? 'dso-keycloak-realm'

export const keycloakClientId: string = process.env.KEYCLOAK_CLIENT_ID ?? 'dso-keycloak-client-id'

export const keycloakRedirectUri: string = process.env.KEYCLOAK_REDIRECT_URI ?? 'dso-keycloak-redirect-uri'

export const contactEmail: string = process.env.CONTACT_EMAIL ?? 'cloudpinative-relations@interieur.gouv.fr'
