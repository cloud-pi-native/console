import projectsRouter from './project.js'
import { send200 } from '../utils/response.js'

const version = process.env.npm_package_version

const getVersion = (_req, res) => {
  send200(res, version)
}

const router = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.register(projectsRouter, { prefix: '/projects' })
}

export default router
