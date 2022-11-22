import fastify from 'fastify'
import helmet from '@fastify/helmet'
import routes from './routes/index.js'
import { loggerConf } from './utils/logger.js'

export const apiPrefix = '/api/v1'

const app = await fastify({ logger: loggerConf[process.env.NODE_ENV] ?? true })
  .register(helmet)
  .register(routes, { prefix: apiPrefix })

export default app
