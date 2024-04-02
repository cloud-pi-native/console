import fp from 'fastify-plugin'
import { Project, Cluster, Repository } from '@prisma/client'
import { User } from '@cpn-console/test-utils'
import { RepoCreds } from '@cpn-console/hooks'
import { genericProxy } from './proxy.js'

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
      upsertProject: hookTemplate,
      deleteProject: hookTemplate,
      // clusters
      upsertCluster: hookTemplate,
      deleteCluster: hookTemplate,
      // misc
      retrieveUserByEmail: hookTemplate,
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

// MOCK de l'objet Hook
const resultsBase = {
  failed: false,
  args: {
    repositories: [],
  },
  results: {},
}

const resultsFetch = {
  failed: false,
  args: {},
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
}

const secretsResult = {
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
}

type ReposCreds = Record<Repository['internalRepoName'], RepoCreds>

const misc = {
  fetchOrganizations: async () => resultsFetch,
  retrieveUserByEmail: async (_email: string) => resultsBase,
  checkServices: async () => resultsBase,
}

const project = {
  upsert: async (_projectId: Project['id'], _reposCreds?: ReposCreds) => {
    return {
      results: structuredClone(resultsBase),
      project: {},
    }
  },
  delete: async (_projectId: Project['id']) => {
    return {
      results: structuredClone(resultsBase),
      project: {},
    }
  },
  getSecrets: async (_projectId: Project['id']) => {
    return secretsResult
  },
}

const cluster = {
  upsert: async (_clusterId: Cluster['id']) => resultsBase,
  delete: async (_clusterId: Cluster['id']) => resultsBase,
}

export const mockHookWrapper = () => ({
  hook: {
    misc: genericProxy(misc, { checkServices: [], fetchOrganizations: [], retrieveUserByEmail: [] }),
    project: genericProxy(project, { delete: ['upsert'], upsert: ['delete'], getSecrets: ['delete'] }),
    cluster: genericProxy(cluster, { delete: ['upsert'], upsert: ['delete'] }),
  },
})
