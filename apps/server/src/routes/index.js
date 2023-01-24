import ciFilesRouter from './ci-files.js'
import environmentsRouter from './environment.js'
import organizationsRouter from './organization.js'
import projectsRouter from './project.js'
import reposRouter from './repository.js'
import usersRouter from './user.js'
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
  await app.register(organizationsRouter, { prefix: '/organizations' })
  await app.register(projectsRouter, { prefix: '/projects' })
  await app.register(reposRouter, { prefix: '/repositories' })
  await app.register(usersRouter, { prefix: '/users' })
}

export const miscRouter = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.get('/healthz', getHealth)
}
