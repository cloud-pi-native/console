import { send200 } from '../utils/response.js'
import { generateRoute } from '../utils/generate-route.js'
import { getLogInfos } from '../utils/logger.js'

const version = process.env.npm_package_version || 'Unable to find version'

const getVersion = async (_req, res) => {
  send200(res, version)
}

const getHealth = async (_req, res) => {
  send200(res, 'OK')
}

const apiRoutes = [
  { path: '/project', method: 'post' },
  { path: '/project', method: 'delete' },
  { path: '/project/users', method: 'post' },
  { path: '/project/users', method: 'delete' },
  { path: '/project/repos', method: 'put' },
  { path: '/project/repos', method: 'post' },
  { path: '/project/repos', method: 'delete' },
  { path: '/project/envlist', method: 'post' },
  { path: '/project/envlist', method: 'delete' },
  // { path: '/project/owner', method: 'put' },
]

export const apiRouter = async (app, _opts) => {
  apiRoutes.forEach(async ({ path, method }) => {
    try {
      await app[method](path, generateRoute(path, method))
    } catch (error) {
      app.log.error({ ...getLogInfos, message: error.message })
      process.exit(1)
    }
  })
}

export const miscRouter = async (app, _opts) => {
  await app.get('/version', getVersion)
  await app.get('/healthz', getHealth)
}
