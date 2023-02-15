import fastify from 'fastify'
import helmet from '@fastify/helmet'
import keycloak from 'fastify-keycloak-adapter'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import { nanoid } from 'nanoid'
import { apiRouter, miscRouter } from './routes/index.js'
import { loggerConf } from './utils/logger.js'
import { keycloakConf, sessionConf } from './utils/keycloak.js'

export const apiPrefix = '/api/v1'

const fastifyConf = {
  logger: loggerConf[process.env.NODE_ENV] ?? true,
  genReqId: () => nanoid(),
}

const app = fastify(fastifyConf)
  .register(helmet)
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)
  .register(keycloak, keycloakConf)
  .register(apiRouter, { prefix: apiPrefix })
  .register(miscRouter)

export default app
