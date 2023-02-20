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

const routes = {}
const app = await fastify(fastifyConf)
  .register(helmet)
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)
  .register(keycloak, keycloakConf)
  .addHook('onRoute', route => {
    if (route.path === '/healthz') {
      route.logLevel = 'silent'
    }
    if (routes[route.path]) routes[route.path].push(route.method)
    else routes[route.path] = [route.method].flat()
  })
  .register(apiRouter, { prefix: apiPrefix })
  .register(miscRouter)

Object.keys(routes)
  .sort((a, b) => a.localeCompare(b))
  .forEach(key => app.log.info(`${key.padEnd(30, ' ')}${JSON.stringify(routes[key])}`))

export default app
