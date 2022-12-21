import projectsRouter from './project.js'
import repositoriesRouter from './repository.js'
import { send200 } from '../utils/response.js'

const version = process.env.npm_package_version

const getVersion = (_req, res) => {
  send200(res, version)
}

const getHealth = (_req, res) => {
  send200(res, 'OK')
}

const router = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.get('/health', getHealth)
  await app.register(projectsRouter, { prefix: '/projects' })
  await app.register(repositoriesRouter, { prefix: '/repos' })
}

export default router
