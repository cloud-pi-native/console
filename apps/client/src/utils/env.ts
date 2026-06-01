/* eslint-disable no-template-curly-in-string */
export const serverHost: string = process.env.SERVER_HOST ?? '${SERVER_HOST}'

export const serverPort: string = process.env.SERVER_PORT ?? '${SERVER_PORT}'

export const clientPort: string = process.env.CLIENT_PORT ?? '${CLIENT_PORT}'

export const keycloakProtocol: string = process.env.KEYCLOAK_PROTOCOL ?? '${KEYCLOAK_PROTOCOL}'

export const keycloakDomain: string = process.env.KEYCLOAK_DOMAIN ?? '${KEYCLOAK_DOMAIN}'

export const keycloakRealm: string = process.env.KEYCLOAK_REALM ?? '${KEYCLOAK_REALM}'

export const keycloakClientId: string = process.env.KEYCLOAK_CLIENT_ID ?? '${KEYCLOAK_CLIENT_ID}'

export const keycloakRedirectUri: string = process.env.KEYCLOAK_REDIRECT_URI ?? '${KEYCLOAK_REDIRECT_URI}'

export const contactEmail: string = process.env.CONTACT_EMAIL ?? '${CONTACT_EMAIL}'

export const openCDSEnabled: string = process.env.OPENCDS_ENABLED ?? '${OPENCDS_ENABLED}'
