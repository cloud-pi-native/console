import ciFilesRouter from './ci-files.js'
import environmentsRouter from './environment.js'
import organizationRouter from './organization.js'
import projectRouter from './project.js'
import repoRouter from './repository.js'
import userRouter from './user.js'
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
  await app.register(environmentsRouter, { prefix: '/environments' })
  await app.register(organizationRouter, { prefix: '/organizations' })
  await app.register(projectRouter, { prefix: '/projects' })
  await app.register(repoRouter, { prefix: '/repositories' })
  await app.register(userRouter, { prefix: '/users' })
}

export const miscRouter = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.get('/healthz', getHealth)
}
