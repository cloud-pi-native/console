import ciFilesRouter from '../generate-files/controllers.js'
import projectOrganizationRouter from './organization/controllers.js'
import projectRouter from './project/controllers.js'
import serviceRouter from './service/controllers.js'
import projectQuotaRouter from './quota/controllers.js'
import projectStageRouter from './stage/controllers.js'
import projectClusterRouter from './cluster/controllers.js'
import { sendOk } from '../utils/response.js'
import adminRouter from './index-admin.js'
import type { FastifyInstance } from 'fastify'
import { usersRouter } from './user/controllers.js'

const version = process.env.APP_VERSION || 'dev'

const getVersion = async (_req, res) => {
  sendOk(res, version)
}

const getHealth = async (_req, res) => {
  sendOk(res, 'OK')
}

export const apiRouter = async (app: FastifyInstance, _opts) => {
  await app.register(ciFilesRouter, { prefix: '/ci-files' })
  await app.register(serviceRouter, { prefix: '/services' })
  await app.register(projectOrganizationRouter, { prefix: '/organizations' })
  await app.register(projectClusterRouter, { prefix: '/clusters' })
  await app.register(projectQuotaRouter, { prefix: '/quotas' })
  await app.register(projectStageRouter, { prefix: '/stages' })
  await app.register(projectRouter, { prefix: '/projects' })
  await app.register(adminRouter, { prefix: '/admin' })
  await app.register(usersRouter, { prefix: '/users' })
}

export const miscRouter = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.get('/healthz', getHealth)
}
