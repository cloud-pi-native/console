import fastify from 'fastify'
import helmet from '@fastify/helmet'
import keycloak from 'fastify-keycloak-adapter'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'

import routes from './routes/index.js'
import { loggerConf } from './utils/logger.js'

export const apiPrefix = '/api/v1'

const opts = {
  appOrigin: 'http://localhost:8080',
  keycloakSubdomain: 'keycloak:8080/realms/quickstart',
  clientId: 'test-backend',
  clientSecret: 'client-secret-backend',
  retries: 10,
  disableCookiePlugin: true,
  disableSessionPlugin: true,
}

const sessionConf = {
  cookieName: 'sessionId',
  secret: 'a-very-strong-secret-with-more-than-32-char',
  cookie: {
    httpOnly: true,
    secure: true,
  },
  expires: 1800000,
}

const app = fastify({ logger: loggerConf[process.env.NODE_ENV] ?? true })
  .register(helmet)
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)
  .register(keycloak, opts)
  .register(routes, { prefix: apiPrefix })

export default app
