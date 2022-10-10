import express from 'express'
import helmet from 'helmet'

import routes from './routes/index.js'
import { logHttp } from './utils/logger.js'

const app = express()

app.use(helmet())

app.use((_req, res, next) => {
  res.header('x-powered-by', 'SDIT')
  next()
})

app.use(express.json())
app.use(apiPrefix, routes)

export default app