import fp from 'fastify-plugin'
import { User } from '@cpn-console/test-utils'

let requestor: User

export const setRequestor = (user: User) => {
  requestor = user
}

export const getRequestor = () => {
  return requestor
}

export const mockSessionPlugin = async () => {
  const sessionPlugin = (app, opt, next) => {
    app.addHook('onRequest', (req, res, next) => {
      req.session = { user: getRequestor() }
      next()
    })
    next()
  }

  return { default: fp(sessionPlugin) }
}

export const mockHooksPackage = () => {
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
          args: {},
          failed: false,
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
}

export const fetchOrganizationsRes = {
  args: undefined,
  failed: false,
  canel: {
    status: {
      result: 'OK',
      message: 'Retrieved',
    },
    results: {
      result: [
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
}

export const filteredOrganizations = [
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
]
