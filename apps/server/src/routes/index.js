import projectsRouter from './project.js'
import ciFilesRouter from './ciFiles.js'
import { send200 } from '../utils/response.js'

const version = process.env.npm_package_version || 'Unable to find version'

const getVersion = async (_req, res) => {
  send200(res, version)
}

const getHealth = async (_req, res) => {
  send200(res, 'OK')
}

export const apiRouter = async (app, _opts) => {
  await app.register(projectsRouter, { prefix: '/projects' })
  await app.register(ciFilesRouter, { prefix: '/ci-files' })
}

export const miscRouter = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.get('/healthz', getHealth)
}
