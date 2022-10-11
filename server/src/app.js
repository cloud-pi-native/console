import express from 'express'
import helmet from 'helmet'

import routes from './routes/index.js'
import { logHttp } from './utils/logger.js'
import { isProd } from './utils/env.js'

const apiPrefix = '/api/v1'

const app = express()

app.use((_req, res, next) => {
  res.header('x-powered-by', 'SDIT')
  next()
})
  .use(helmet())
  .use(express.json())
  .use(apiPrefix, routes)

if (isProd) {
  app.use(logHttp)
}

export default app