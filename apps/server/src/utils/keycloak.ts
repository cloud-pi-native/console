import { serviceContract, swaggerUiPath, systemContract } from '@cpn-console/shared'
import type { KeycloakOptions } from 'fastify-keycloak-adapter'
import {
  keycloakClientId,
  keycloakClientSecret,
  keycloakDomain,
  keycloakProtocol,
  keycloakRealm,
  keycloakRedirectUri,
  sessionSecret,
} from './env.js'
import { bypassFn, userPayloadMapper } from './keycloak-utils'

export const keycloakConf = {
  appOrigin: keycloakRedirectUri ?? 'http://localhost:8080',
  keycloakSubdomain: `${keycloakDomain}/realms/${keycloakRealm}`,
  clientId: keycloakClientId ?? '',
  clientSecret: keycloakClientSecret ?? '',
  useHttps: keycloakProtocol === 'https',
  disableCookiePlugin: true,
  disableSessionPlugin: true,
  // @ts-ignore
  userPayloadMapper,
  retries: 5,
  excludedPatterns: [
    systemContract.getVersion.path,
    systemContract.getHealth.path,
    serviceContract.getServiceHealth.path,
    `${swaggerUiPath}/**`,
  ],
  bypassFn,
} as const satisfies KeycloakOptions

export const sessionConf = {
  cookieName: 'sessionId',
  secret: sessionSecret || 'a-very-strong-secret-with-more-than-32-char',
  cookie: {
    httpOnly: true,
    secure: true,
  },
  expires: 1_800_000,
}
