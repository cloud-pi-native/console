import fastify from 'fastify'
import helmet from '@fastify/helmet'
import keycloak from 'fastify-keycloak-adapter'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import routes from './routes/index.js'
import { loggerConf } from './utils/logger.js'
import { keycloakConf, sessionConf } from './utils/keycloak.js'

export const apiPrefix = '/api/v1'

const app = await fastify({ logger: loggerConf[process.env.NODE_ENV] ?? true })
  .register(helmet)
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)
  .register(keycloak, keycloakConf)
  .register(routes, { prefix: apiPrefix })

export default app
