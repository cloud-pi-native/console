import ciFilesRouter from './ci-files.js'
import projectOrganizationRouter from './organization.js'
import projectRouter from './project.js'
import serviceRouter from './service.js'
import projectQuotaRouter from './quota.js'
import projectStageRouter from './stage.js'
import { sendOk } from '../utils/response.js'
import adminRouter from './admin/index.js'

const version = process.env.APP_VERSION || 'dev'

const getVersion = async (_req, res) => {
  sendOk(res, version)
}

const getHealth = async (_req, res) => {
  sendOk(res, 'OK')
}

export const apiRouter = async (app, _opts) => {
  await app.register(ciFilesRouter, { prefix: '/ci-files' })
  await app.register(serviceRouter, { prefix: '/services' })
  await app.register(projectOrganizationRouter, { prefix: '/organizations' })
  await app.register(projectQuotaRouter, { prefix: '/quotas' })
  await app.register(projectStageRouter, { prefix: '/stages' })
  await app.register(projectRouter, { prefix: '/projects' })
  await app.register(adminRouter, { prefix: '/admin' })
}

export const miscRouter = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.get('/healthz', getHealth)
}
