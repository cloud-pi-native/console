import { apiPrefix } from '@cpn-console/shared'
import {
  keycloakProtocol,
  keycloakDomain,
  keycloakRealm,
  keycloakClientId,
  keycloakClientSecret,
  sessionSecret,
  keycloakRedirectUri,
} from './env.js'

type KeycloakPayload = {
  sub: string
  email: string
  given_name: string
  family_name: string
  groups: string[]
}
const userPayloadMapper = (userPayload: KeycloakPayload) => ({
  id: userPayload.sub,
  email: userPayload.email,
  firstName: userPayload.given_name,
  lastName: userPayload.family_name,
  groups: userPayload.groups || [],
})

export const keycloakConf = {
  appOrigin: keycloakRedirectUri ?? 'http://localhost:8080',
  keycloakSubdomain: `${keycloakDomain}/realms/${keycloakRealm}`,
  clientId: keycloakClientId,
  clientSecret: keycloakClientSecret,
  useHttps: keycloakProtocol === 'https',
  disableCookiePlugin: true,
  disableSessionPlugin: true,
  userPayloadMapper,
  retries: 5,
  excludedPatterns: [`${apiPrefix}/version`, `${apiPrefix}/healthz`, `${apiPrefix}/swagger-ui/**`, `${apiPrefix}/services`],
}

export const sessionConf = {
  cookieName: 'sessionId',
  secret: sessionSecret || 'a-very-strong-secret-with-more-than-32-char',
  cookie: {
    httpOnly: true,
    secure: true,
  },
  expires: 1800000,
}
