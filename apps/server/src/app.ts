import fastify, { FastifyInstance } from 'fastify'
import helmet from '@fastify/helmet'
import keycloak from 'fastify-keycloak-adapter'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { nanoid } from 'nanoid'

import { openApiSchemas } from '@dso-console/shared'

import { apiRouter, miscRouter } from './routes/index.js'
import { addReqLogs, loggerConf } from './utils/logger.js'
import { DsoError } from './utils/errors.js'
import { keycloakConf, sessionConf } from './utils/keycloak.js'
import { isInt, isDev, isTest, keycloakRedirectUri } from './utils/env.js'
import { type FastifyRequestWithSession } from './types/index.js'

export const apiPrefix = '/api/v1'

const fastifyConf = {
  logger: loggerConf[process.env.NODE_ENV] ?? true,
  genReqId: () => nanoid(),
}

export const addSchemasToApp = (schemas: Record<string, unknown>) => (app: FastifyInstance): FastifyInstance => {
  Object.values(schemas).forEach(schema => app.addSchema(schema))
  return app
}

export const addAllSchemasToApp = addSchemasToApp(openApiSchemas)

const app: FastifyInstance = addAllSchemasToApp(fastify(fastifyConf))
  .register(helmet, () => ({
    contentSecurityPolicy: !(isInt || isDev || isTest),
  }))
  .register(fastifySwagger, {
    swagger: {
      info: {
        title: 'API Console DSO',
        description: 'Swagger des routes de la console DSO.',
        version: '1.0.0',
      },
      host: keycloakRedirectUri.split('://')[1],
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
    hideUntagged: true,
  })
  .register(fastifySwaggerUi, {
    routePrefix: `${apiPrefix}/swagger-ui`,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)
  .register(keycloak, keycloakConf)
  .register(apiRouter, { prefix: apiPrefix })
  .register(miscRouter, { prefix: apiPrefix })
  // .addHook('preSerialization', async (request, reply, payload) => {
  //   payload?.forEach(project => {
  //     project?.clusters?.forEach(element => {
  //       console.log(element)
  //     })
  //   })
  //   console.log(Object.keys(payload))

  //   return { wrapped: payload, reply, request }
  // })
  .addHook('onRoute', opts => {
    if (opts.path === '/api/v1/healthz') {
      opts.logLevel = 'silent'
    }
  })
  .setErrorHandler(function (error: DsoError | Error, req: FastifyRequestWithSession<void>, reply) {
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

await app.ready()

export default app
