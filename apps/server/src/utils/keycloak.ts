import app from '../app.js'
import {
  keycloakProtocol,
  keycloakDomain,
  keycloakRealm,
  keycloakClientId,
  keycloakClientSecret,
  sessionSecret,
  port,
} from './env.js'

const userPayloadMapper = (userPayload) => {
  const payload = {
    id: userPayload.sub,
    email: userPayload.email,
    firstName: userPayload.given_name,
    lastName: userPayload.family_name,
  }
  if (!userPayload.groups) {
    app.log.warn('Le user payload de keycloak n\'envoie pas groups')
    return payload
  }
  return {
    ...payload,
    groups: userPayload.groups,
  }
}

export const keycloakConf = {
  appOrigin: `http://localhost:${port}`,
  keycloakSubdomain: `${keycloakDomain}/realms/${keycloakRealm}`,
  clientId: keycloakClientId,
  clientSecret: keycloakClientSecret,
  useHttps: keycloakProtocol === 'https',
  disableCookiePlugin: true,
  disableSessionPlugin: true,
  userPayloadMapper,
  retries: 5,
  excludedPatterns: ['/version', '/healthz'],
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
