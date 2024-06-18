import fastify, { type FastifyRequest } from 'fastify'
import helmet from '@fastify/helmet'
import keycloak from 'fastify-keycloak-adapter'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { initServer } from '@ts-rest/fastify'
import { generateOpenApi } from '@ts-rest/open-api'
import { apiPrefix, getContract } from '@cpn-console/shared'
import { isInt, isDev, isTest } from './utils/env.js'
import { fastifyConf, swaggerUiConf, swaggerConf } from './utils/fastify.js'
import { apiRouter } from './resources/index.js'
import { apiRouterAdmin } from './resources/index-admin.js'
import { keycloakConf, sessionConf } from './utils/keycloak.js'
import { addReqLogs } from './utils/logger.js'
import { DsoError } from './utils/errors.js'

export const serverInstance: ReturnType<typeof initServer> = initServer()

const openApiDocument = generateOpenApi(await getContract(), swaggerConf, { setOperationId: true })

const app = fastify(fastifyConf)
  .register(helmet, () => ({
    contentSecurityPolicy: !(isInt || isDev || isTest),
  }))
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)
  // @ts-ignore
  .register(keycloak, keycloakConf)
  .register(fastifySwagger, { transformObject: () => openApiDocument })
  .register(fastifySwaggerUi, swaggerUiConf)
  .register(apiRouter())
  .register(apiRouterAdmin())
  .addHook('onRoute', opts => {
    if (opts.path === `${apiPrefix}/healthz`) {
      opts.logLevel = 'silent'
    }
  })
  .setErrorHandler(function (error: DsoError | Error, req: FastifyRequest, reply) {
    const isDsoError = error instanceof DsoError

    const statusCode = isDsoError ? error.statusCode : 500
    const message = isDsoError ? error.description : error.message
    if (isTest) {
      reply.status(statusCode).send({ status: statusCode, error: message, stack: error.stack })
    } else {
      reply.status(statusCode).send({ status: statusCode, error: message })
    }
    addReqLogs({
      req,
      message,
      ...(isDsoError ? { extras: error.extras } : {}),
      error: isDsoError ? undefined : error,
    })
  })

await app.ready()

export default app
