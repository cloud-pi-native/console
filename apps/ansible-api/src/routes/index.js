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
  // { path: '/project/users', method: 'post' },
  // { path: '/project/users', method: 'delete' },
  // { path: '/project/repos', method: 'put' },
  { path: '/project/repos', method: 'post' },
  { path: '/project/repos', method: 'delete' },
  // { path: '/project/env', method: 'post' },
  // { path: '/project/env', method: 'delete' },
  // { path: '/project/owner', method: 'put' },
]

// TODO requête delete repos :
// incoming request {"reqId":"uIK4mI6YTXwn9-Ym35oZP","req":{"method":"DELETE","url":"/api/v1/project/repos","hostname":"ansible-api:8100","remoteAddress":"172.19.0.5","remotePort":38476}}
// Unexpected token o in JSON at position 1 { "reqId": "uIK4mI6YTXwn9-Ym35oZP", "res": { "statusCode": 400 } }

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
