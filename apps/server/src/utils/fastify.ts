// import { randomUUID } from 'node:crypto'
import type { FastifyServerOptions } from 'fastify'
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui/types'
import { nanoid } from 'nanoid'
import { apiPrefix } from '@cpn-console/shared'
import { loggerConf } from './logger.js'

export const fastifyConf: FastifyServerOptions = {
  maxParamLength: 5000,
  logger: loggerConf[`${process.env.NODE_ENV || 'production'}`] ?? true,
  genReqId: () => nanoid(), // randomUUID(),
}

const externalDocs = {
  description: 'External documentation.', url: 'https://cloud-pi-native.fr',
}

export const swaggerConf = {
  info: {
    title: 'Console Cloud Pi Native',
    description: 'API de gestion des ressources Cloud Pi Native.',
    version: process.env.APP_VERSION || 'dev',
  },
  externalDocs,
  servers: [
    // { url: keycloakRedirectUri?.includes('://') ? keycloakRedirectUri.split('://')[1] : 'localhost' }, // TODO: replace with app url
  ],
}

export const swaggerUiConf: FastifySwaggerUiOptions = {
  routePrefix: apiPrefix + '/swagger-ui',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
}
