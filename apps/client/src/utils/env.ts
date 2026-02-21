export const serverHost: string = process.env.SERVER_HOST ?? 'dso-server-host'

export const serverPort: string = process.env.SERVER_PORT ?? 'dso-server-port'

export const clientPort: string = process.env.CLIENT_PORT ?? 'dso-client-port'

export const keycloakProtocol: string = 'https'

export const keycloakDomain: string = 'keycloak.dso.cpin-hp.numerique-interieur.fr'

export const keycloakRealm: string = 'dso'

export const keycloakClientId: string = 'console-frontend'

export const keycloakRedirectUri: string = 'http://localhost:8080'

export const contactEmail: string = process.env.CONTACT_EMAIL ?? 'cloudpinative-relations@interieur.gouv.fr'

export const openCDSEnabled: string = process.env.OPENCDS_ENABLED ?? 'dso-opencds-enabled'
