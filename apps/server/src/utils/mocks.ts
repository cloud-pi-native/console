import fp from 'fastify-plugin'
import type { Repository } from '@prisma/client'
import { PluginsManifests, RepoCreds, ServiceInfos, editStrippers, populatePluginManifests } from '@cpn-console/hooks'
import { DEFAULT, DISABLED, PROJECT_PERMS } from '@cpn-console/shared'
import { UserDetails } from '../types/index.js'
import { faker } from '@faker-js/faker'
import * as utilsController from '../utils/controller.js'

let requestor: Requestor

export const setRequestor = (user: Requestor = getRandomRequestor()) => {
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

export type ReposCreds = Record<Repository['internalRepoName'], RepoCreds>

type Requestor = Partial<UserDetails>
export const getRandomRequestor = (user?: Requestor): Partial<UserDetails> => ({
  id: user?.id ?? faker.string.uuid(),
  email: user?.email ?? faker.internet.email(),
  firstName: user?.firstName ?? faker.person.firstName(),
  lastName: user?.lastName ?? faker.person.lastName(),
  ...user?.groups !== null && { groups: user?.groups ?? [] },
})

export function getUserMockInfos(isAdmin: boolean, user?: UserDetails): utilsController.UserProfile
export function getUserMockInfos(isAdmin: boolean, user?: UserDetails, project?: utilsController.ProjectPermState): utilsController.UserProjectProfile
export function getUserMockInfos(isAdmin: boolean, user = getRandomRequestor(), project?: utilsController.ProjectPermState): utilsController.UserProfile | utilsController.UserProjectProfile {
  return {
    adminPermissions: isAdmin ? 2n : 0n,
    user,
    ...project,
  }
}

export function getProjectMockInfos({ projectId, projectLocked, projectOwnerId, projectPermissions, projectStatus }: Partial<utilsController.ProjectPermState>): utilsController.ProjectPermState {
  return {
    projectId: projectId ?? faker.string.uuid(),
    projectLocked: projectLocked ?? false,
    projectOwnerId: projectOwnerId ?? faker.string.uuid(),
    projectStatus: projectStatus ?? 'created',
    projectPermissions: projectPermissions ?? PROJECT_PERMS.MANAGE,
  }
}
