import fp from 'fastify-plugin'
import type { Repository } from '@prisma/client'
import type { PluginsManifests, RepoCreds, ServiceInfos } from '@cpn-console/hooks'
import { editStrippers, populatePluginManifests } from '@cpn-console/hooks'
import { DEFAULT, DISABLED, PROJECT_PERMS } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import type { UserDetails } from '../types/index.js'
import type * as utilsController from '../utils/controller.js'

let requestor: Requestor

export function setRequestor(user: Requestor = getRandomRequestor()) {
  requestor = user
}

export function getRequestor() {
  return requestor
}

export async function mockSessionPlugin() {
  const sessionPlugin = (app, opt, next) => {
    app.addHook('onRequest', (req, res, next) => {
      req.session = { user: getRequestor() }
      next()
    })
    next()
  }

  return { default: fp(sessionPlugin) }
}

export async function mockHooksPackage() {
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
    },
  }
}

export type ReposCreds = Record<Repository['internalRepoName'], RepoCreds>

type Requestor = Partial<UserDetails>
export function getRandomRequestor(user?: Requestor): Partial<UserDetails> {
  return {
    id: user?.id ?? faker.string.uuid(),
    email: user?.email ?? faker.internet.email(),
    firstName: user?.firstName ?? faker.person.firstName(),
    lastName: user?.lastName ?? faker.person.lastName(),
    type: 'human',
    ...user?.groups !== null && { groups: user?.groups ?? [] },
  }
}

export function getUserMockInfos(isAdmin: boolean, user?: UserDetails): utilsController.UserProfile & utilsController.ProjectPermState
export function getUserMockInfos(isAdmin: boolean, user?: UserDetails, project?: utilsController.ProjectPermState): utilsController.UserProjectProfile & utilsController.ProjectPermState
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

export const atDates = {
  createdAt: new Date(),
  updatedAt: new Date(),
}
