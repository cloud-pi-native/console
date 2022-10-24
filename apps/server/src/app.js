import fastify from 'fastify'
import helmet from '@fastify/helmet'
import keycloak from 'fastify-keycloak-adapter'

import routes from './routes/index.js'
import { loggerConf } from './utils/logger.js'

export const apiPrefix = '/api/v1'

const opts = {
  appOrigin: 'http://keycloak:8080',
  keycloakSubdomain: 'keycloak:8080/realms/TEST',
  clientId: 'TEST',
  clientSecret: 'TEST',
  retries: 10,
}

const app = fastify({ logger: loggerConf[process.env.NODE_ENV] ?? true })
  .register(helmet)
  .register(keycloak, opts)
  .register(routes, { prefix: apiPrefix })

export default app
