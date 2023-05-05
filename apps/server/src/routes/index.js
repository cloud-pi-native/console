import ciFilesRouter from './ci-files.js'
import projectOrganizationRouter from './organization.js'
import projectRouter from './project.js'
import serviceRouter from './service.js'
import { sendOk } from '../utils/response.js'
import adminRouter from './admin/user.js'

const version = process.env.npm_package_version || 'Unable to find version'

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
  await app.register(projectRouter, { prefix: '/projects' })
  await app.register(adminRouter, { prefix: '/admin' })
}

export const miscRouter = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.get('/healthz', getHealth)
}
