import ciFilesRouter from './ci-files.js'
import projectOrganizationRouter from './organization.js'
import projectRouter from './project.js'
import testRouter from './websocket.js'
import { send200 } from '../utils/response.js'

const version = process.env.npm_package_version || 'Unable to find version'

const getVersion = async (_req, res) => {
  send200(res, version)
}

const getHealth = async (_req, res) => {
  send200(res, 'OK')
}

export const apiRouter = async (app, _opts) => {
  await app.register(ciFilesRouter, { prefix: '/ci-files' })
  await app.register(projectOrganizationRouter, { prefix: '/organizations' })
  await app.register(projectRouter, { prefix: '/projects' })
  await app.register(testRouter, { prefix: '/test' })
}

export const miscRouter = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.get('/healthz', getHealth)
}
