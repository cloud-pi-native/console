import fp from 'fastify-plugin'
import { Project, Cluster, Repository } from '@prisma/client'
import { User } from '@cpn-console/test-utils'
import { PluginsManifests, RepoCreds, ServiceInfos, editStrippers, populatePluginManifests } from '@cpn-console/hooks'
import { genericProxy } from './proxy.js'
import { DEFAULT, DISABLED } from '@cpn-console/shared'

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

export const mockHooksPackage = async () => {
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
    editStrippers,
    populatePluginManifests,
    services: {
      getStatus: () => [],
      refreshStatus: async () => [],
    },
    PluginApi: class { },
    servicesInfos: {
      registry: { title: 'Harbor', name: 'registry', to: () => 'test' },
      plugin2: { title: 'Plugin2', name: 'plugin2', to: () => ({ to: 'test', title: 'Test' }) },
      plugin3: { title: 'Plugin3', name: 'plugin3', to: () => [{ to: 'test', title: 'Test' }] },
      plugin4: { title: 'Plugin4', name: 'plugin4', to: () => [{ to: 'test' }] },
      plugin5: { title: 'Plugin5', name: 'plugin5' },
    } as Record<string, ServiceInfos>,
    pluginsManifests: {
      registry: {
        title: 'Harbor',
        global: [{
          kind: 'switch',
          initialValue: DEFAULT,
          key: 'test2',
          permissions: {
            admin: { read: true, write: true },
            user: { read: true, write: false },
          },
          title: 'Test2',
          value: DEFAULT,
          description: 'description',
        }],
        project: [{
          kind: 'switch',
          key: 'test2',
          permissions: {
            admin: { read: true, write: true },
            user: { read: true, write: true },
          },
          title: 'Test',
          value: DEFAULT,
          initialValue: DISABLED,
        }],
      },
    } as PluginsManifests,
    hooks: {
      // projects
      getProjectSecrets: {
        execute: () => ({
          failed: false,
          args: {},
          results: {
            registry: {
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
      // user
      retrieveUserByEmail: hookTemplate,
      retrieveAdminUsers: hookTemplate,
      updateUserAdminGroupMembership: hookTemplate,
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
    registry: {
      secrets: {
        token: 'myToken',
      },
      status: {
        failed: false,
      },
    },
  },
}

const resultsKeycloakAdmins = {
  failed: false,
  args: {
  },
  results: {
    keycloak: {
      adminIds: [],
    },
  },
}

export type ReposCreds = Record<Repository['internalRepoName'], RepoCreds>

const misc = {
  fetchOrganizations: async () => resultsFetch,
  checkServices: async () => resultsBase,
  syncRepository: async () => resultsBase,
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

const user = {
  retrieveUserByEmail: async (_email: string) => resultsBase,
  retrieveAdminUsers: async () => resultsKeycloakAdmins,
  updateUserAdminGroupMembership: async (_id: string) => resultsBase,
}

export const mockHookWrapper = () => ({
  hook: {
    misc: genericProxy(misc, { checkServices: [], fetchOrganizations: [], syncRepository: [] }),
    project: genericProxy(project, { delete: ['upsert'], upsert: ['delete'], getSecrets: ['delete'] }),
    cluster: genericProxy(cluster, { delete: ['upsert'], upsert: ['delete'] }),
    user: genericProxy(user, { retrieveUserByEmail: [], retrieveAdminUsers: [], updateUserAdminGroupMembership: [] }),
  },
})
