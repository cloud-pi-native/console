import { vi } from 'vitest'
import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import fp from 'fastify-plugin'
import { addAllSchemasToApp, apiPrefix } from '@/app.js'
import { apiRouter, miscRouter } from '@/resources/index.js'
import { sessionConf } from '@/utils/keycloak.js'
import { User } from '@cpn-console/test-utils'

global.process.exit = vi.fn()
vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => { vi.fn() }) }))

vi.mock('@cpn-console/hooks', async () => {
  const hooks = await vi.importActual('@cpn-console/hooks')
  const hookTemplate = {
    execute: () => ({
      args: {},
      failed: false,
    }),
    validate: () => ({
      failed: false,
    }),
  }

  return {
    ...hooks,
    services: {
      getForProject: () => { },
      getStatus: () => [],
      refreshStatus: async () => [],
    },
    PluginApi: class { },
    servicesInfos: {
      gitlab: { title: 'Gitlab' },
      harbor: { title: 'Harbor' },
    },
    hooks: {
      // projects
      getProjectSecrets: {
        execute: () => ({
          failed: false,
          args: {},
          results: {
            gitlab: {
              secrets: {
                token: 'myToken',
              },
              status: {
                failed: false,
              },
            },
            harbor: {
              secrets: {
                token: 'myToken',
              },
              status: {
                failed: false,
              },
            },
          },
        }),
      },
      createProject: hookTemplate,
      updateProject: hookTemplate,
      archiveProject: hookTemplate,
      // repos
      updateRepository: hookTemplate,
      createRepository: hookTemplate,
      deleteRepository: hookTemplate,
      // envs
      initializeEnvironment: hookTemplate,
      updateEnvironmentQuota: hookTemplate,
      deleteEnvironment: hookTemplate,
      // users
      retrieveUserByEmail: hookTemplate,
      addUserToProject: hookTemplate,
      updateUserProjectRole: hookTemplate,
      removeUserFromProject: hookTemplate,
      // permissions
      setEnvPermission: hookTemplate,
      // clusters
      createCluster: hookTemplate,
      updateCluster: hookTemplate,
      deleteCluster: hookTemplate,
      // organizations
      fetchOrganizations: {
        execute: () => ({
          args: undefined,
          results: {
            canel: {
              status: {
                result: 'OK',
                message: 'Retrieved',
              },
              result: {
                organizations: [
                  {
                    name: 'genat',
                    label: 'MI - gendaremerie nationale',
                    source: 'canel',
                  },
                  {
                    name: 'mas',
                    label: 'ministère affaires sociaux',
                    source: 'canel',
                  },
                  {
                    name: 'genat',
                    label: 'ministère affaires sociaux',
                    source: 'canel',
                  },
                ],
              },
            },
          },
        }),
      },
    },
  }
})

let requestor: User

export const setRequestor = (user: User) => {
  requestor = user
}

export const getRequestor = () => {
  return requestor
}

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    req.session = { user: getRequestor() }
    next()
  })
  next()
}

const app = addAllSchemasToApp(fastify({ logger: false }))
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)
  .register(fp(mockSessionPlugin))
  .register(miscRouter, { prefix: apiPrefix })
  .register(apiRouter, { prefix: apiPrefix })
// useful to debug fastify error
// .addHook('onError', (req, res, err, done) => {
//   console.log(err)
//   done()
// })
await app.ready()

vi.spyOn(app, 'listen')
vi.spyOn(app.log, 'info')
vi.spyOn(app.log, 'warn')
vi.spyOn(app.log, 'error')
vi.spyOn(app.log, 'debug')

export default app
