import type { FastifyRequest } from 'fastify'
import fastify from 'fastify'
import helmet from '@fastify/helmet'
import keycloak from 'fastify-keycloak-adapter'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { initServer } from '@ts-rest/fastify'
import { generateOpenApi } from '@ts-rest/open-api'
import { apiPrefix, getContract } from '@cpn-console/shared'
import { isDev, isInt, isTest } from './utils/env'
import { fastifyConf, swaggerConf, swaggerUiConf } from './utils/fastify'
import { apiRouter } from './resources/index'
import { keycloakConf, sessionConf } from './utils/keycloak'
import type { CustomLogger } from './utils/logger'
import { log } from './utils/logger'

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
  .addHook('onRoute', (opts) => {
    if (opts.path === `${apiPrefix}/healthz`) {
      opts.logLevel = 'silent'
    }
  })
  .setErrorHandler((error: Error, req: FastifyRequest, reply) => {
    const statusCode = 500
    // @ts-ignore vérifier l'objet
    const message = error.description || error.message
    reply.status(statusCode).send({ status: statusCode, error: message, stack: error.stack })
    log('info', { reqId: req.id, error })
  })
  .addHook('onResponse', (req, res) => {
    if (res.statusCode < 400) {
      req.log.info({ status: res.statusCode, userId: req.session?.user?.id })
    } else if (res.statusCode < 500) {
      req.log.warn({ status: res.statusCode, userId: req.session?.user?.id })
    } else {
      req.log.error({ status: res.statusCode, userId: req.session?.user?.id })
    }
  })

await app.ready()

export const logger = app.log as CustomLogger
export default app
