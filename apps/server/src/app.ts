import fastify from 'fastify'
import helmet from '@fastify/helmet'
import keycloak from 'fastify-keycloak-adapter'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import { nanoid } from 'nanoid'
import { apiRouter, miscRouter } from './routes/index.js'
import { addReqLogs, loggerConf } from './utils/logger.js'
import { DsoError } from './utils/errors.js'
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
  .addHook('onRoute', opts => {
    if (opts.path === '/healthz') {
      opts.logLevel = 'silent'
    }
  })
  .setErrorHandler(function (error: DsoError | Error, req, reply) {
    const isDsoError = error instanceof DsoError

    const statusCode = isDsoError ? error.statusCode : 500
    const description = isDsoError ? error.description : error.message
    reply.status(statusCode).send({ status: statusCode, error: description })
    addReqLogs({
      req,
      description,
      ...(isDsoError ? { extras: error.extras } : {}),
      error: isDsoError ? null : error,
    })
  })

export default app
