import { isProd, isCI } from './env.js'
export const keycloakDomain = process.env.KEYCLOAK_DOMAIN
export const keycloakRealm = process.env.KEYCLOAK_REALM

const userPayloadMapper = (userPayload) => ({
  id: userPayload.sub,
  email: userPayload.email,
  firstName: userPayload.given_name,
  lastName: userPayload.family_name,
})

export const keycloakConf = {
  appOrigin: 'http://localhost:4000',
  keycloakSubdomain: `${keycloakDomain}/realms/${keycloakRealm}`,
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  useHttps: isProd && !isCI,
  disableCookiePlugin: true,
  disableSessionPlugin: true,
  userPayloadMapper,
  retries: 5,
}

export const sessionConf = {
  cookieName: 'sessionId',
  secret: process.env.SESSION_SECRET || 'a-very-strong-secret-with-more-than-32-char',
  cookie: {
    httpOnly: true,
    secure: true,
  },
  expires: 1800000,
}
