import type { Mocked } from 'vitest'
import type { ProjectWithDetails } from './keycloak-datastore.service'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import {
  makeGroupRepresentation,
  makeProjectEnvironment,
  makeProjectMember,
  makeProjectRole,
  makeProjectUser,
  makeProjectWithDetails,
  makeUserRepresentation,
} from './keycloack-testing.utils'
import { KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { KeycloakService } from './keycloak.service'

function createKeycloakControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      KeycloakService,
      {
        provide: KeycloakClientService,
        useValue: {
          getAllGroups: vi.fn().mockImplementation(async function* () {}),
          deleteGroup: vi.fn().mockResolvedValue(undefined),
          getOrCreateGroupByPath: vi.fn().mockResolvedValue({}),
          getGroupMembers: vi.fn().mockResolvedValue([]),
          addUserToGroup: vi.fn().mockResolvedValue(undefined),
          removeUserFromGroup: vi.fn().mockResolvedValue(undefined),
          getOrCreateSubGroupByName: vi.fn().mockResolvedValue({}),
          getOrCreateRoleGroup: vi.fn().mockResolvedValue({}),
          getSubGroups: vi.fn().mockImplementation(async function* () {}),
          getOrCreateConsoleGroup: vi.fn().mockResolvedValue(makeGroupRepresentation({ id: 'console-group-id', name: 'console' })),
          getOrCreateEnvironmentGroups: vi.fn().mockResolvedValue({
            roGroup: makeGroupRepresentation({ id: 'ro-id', name: 'RO' }),
            rwGroup: makeGroupRepresentation({ id: 'rw-id', name: 'RW' }),
          }),
        } satisfies Partial<KeycloakClientService>,
      },
      {
        provide: KeycloakDatastoreService,
        useValue: {
          getAllProjects: vi.fn().mockResolvedValue([]),
        } satisfies Partial<KeycloakDatastoreService>,
      },
      {
        provide: ConfigurationService,
        useValue: {
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('keycloakService', () => {
  let service: KeycloakService
  let keycloak: Mocked<KeycloakClientService>
  let keycloakDatastore: Mocked<KeycloakDatastoreService>

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await createKeycloakControllerServiceTestingModule().compile()
    service = module.get(KeycloakService)
    keycloak = module.get(KeycloakClientService)
    keycloakDatastore = module.get(KeycloakDatastoreService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('reconcile', () => {
    const mockProject: ProjectWithDetails = makeProjectWithDetails({
      id: 'project-id',
      slug: 'test-project',
      ownerId: 'owner-id',
      everyonePerms: 0n,
    })

    it('should purge orphans', async () => {
      keycloakDatastore.getAllProjects.mockResolvedValue([mockProject])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project', subGroups: [] })
      const orphanGroup = makeGroupRepresentation({
        id: 'orphan-id',
        name: 'orphan-project',
        subGroups: [makeGroupRepresentation({ name: 'console' })],
      })

      keycloak.getAllGroups.mockImplementation(async function* () {
        yield projectGroup
        yield orphanGroup
      })
      keycloak.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloak.getGroupMembers.mockResolvedValue([])
      keycloak.getOrCreateSubGroupByName.mockResolvedValue(makeGroupRepresentation({ id: 'console-id', name: 'console' }))
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })
      await service.handleCron()

      expect(keycloakDatastore.getAllProjects).toHaveBeenCalled()
      expect(keycloak.getAllGroups).toHaveBeenCalled()
      expect(keycloak.getOrCreateGroupByPath).toHaveBeenCalledWith('/test-project')
      expect(keycloak.deleteGroup).toHaveBeenCalledWith('orphan-id')
    })

    it('should sync project members', async () => {
      const projectWithMembers = makeProjectWithDetails({
        ...mockProject,
        members: [
          makeProjectMember({
            user: makeProjectUser({ id: 'user-1', email: 'user1@example.com' }),
            roleIds: [],
          }),
        ],
      })
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithMembers])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      keycloak.getOrCreateGroupByPath.mockResolvedValue(projectGroup)

      // Current members: user-2 (extra), missing user-1
      keycloak.getGroupMembers.mockResolvedValue([
        makeUserRepresentation({ id: 'user-2', email: 'user2@example.com' }),
      ])

      keycloak.getOrCreateSubGroupByName.mockResolvedValue(makeGroupRepresentation({ id: 'console-id', name: 'console' }))
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Should add missing member
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'group-id')
      // Should add owner (missing in group members)
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('owner-id', 'group-id')
      // Should remove extra member
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'group-id')
    })

    it('should sync OIDC role groups', async () => {
      const roleWithOidc = makeProjectRole({
        id: 'role-oidc',
        permissions: 0n,
        oidcGroup: '/oidc-group',
        type: 'managed',
      })
      const projectWithRole = makeProjectWithDetails({
        ...mockProject,
        members: [
          makeProjectMember({
            user: makeProjectUser({ id: 'user-1', email: 'user1@example.com' }),
            roleIds: ['role-oidc'],
          }),
        ],
        roles: [roleWithOidc],
      })
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithRole])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console' }
      const roleGroup = makeGroupRepresentation({ id: 'role-group-id', name: 'oidc-group', path: '/console/oidc-group' })

      keycloak.getOrCreateGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        return Promise.resolve({})
      })
      keycloak.getOrCreateConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.getOrCreateRoleGroup.mockResolvedValue(roleGroup)

      // Project members: owner
      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([makeUserRepresentation({ id: 'owner-id' })])
        // Role group members: user-2 (extra), missing user-1
        if (groupId === 'role-group-id') return Promise.resolve([makeUserRepresentation({ id: 'user-2', email: 'user2@example.com' })])
        return Promise.resolve([])
      })

      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Should create/get role group
      expect(keycloak.getOrCreateRoleGroup).toHaveBeenCalledWith(consoleGroup, '/oidc-group')
      // Should add user-1 to role group
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'role-group-id')
      // Should remove user-2 from role group
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'role-group-id')
    })

    it('should sync environment groups', async () => {
      const projectWithEnv = makeProjectWithDetails({
        ...mockProject,
        environments: [makeProjectEnvironment({ id: 'env-1', name: 'dev' })],
      })
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithEnv])

      const projectGroup = makeGroupRepresentation({
        id: 'group-id',
        name: 'test-project',
        subGroups: [makeGroupRepresentation({ name: 'console', id: 'console-id' })],
      })
      keycloak.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloak.getGroupMembers.mockResolvedValue([])

      // Mock console group retrieval
      keycloak.getOrCreateConsoleGroup.mockResolvedValue(makeGroupRepresentation({ id: 'console-id', name: 'console' }))
      keycloak.getOrCreateEnvironmentGroups.mockResolvedValue({
        roGroup: makeGroupRepresentation({ id: 'dev-ro-id', name: 'RO' }),
        rwGroup: makeGroupRepresentation({ id: 'dev-rw-id', name: 'RW' }),
      })
      keycloak.getOrCreateSubGroupByName.mockImplementation((_parentId, name) => {
        if (name === 'console') return Promise.resolve(makeGroupRepresentation({ id: 'console-id', name: 'console' }))
        if (name === 'dev') return Promise.resolve(makeGroupRepresentation({ id: 'dev-id', name: 'dev' }))
        if (name === 'RO') return Promise.resolve(makeGroupRepresentation({ id: 'dev-ro-id', name: 'RO' }))
        if (name === 'RW') return Promise.resolve(makeGroupRepresentation({ id: 'dev-rw-id', name: 'RW' }))
        return Promise.resolve(makeGroupRepresentation({ id: 'new-id', name }))
      })

      // Mock existing environments: 'staging' (extra)
      keycloak.getSubGroups.mockImplementation(async function* (parentId) {
        if (parentId === 'console-id') {
          yield makeGroupRepresentation({ id: 'staging-id', name: 'staging' })
        }
        if (parentId === 'staging-id') {
          yield makeGroupRepresentation({ name: 'RO' })
          yield makeGroupRepresentation({ name: 'RW' })
        }
      })

      await service.handleCron()

      // Should create dev group
      expect(keycloak.getOrCreateConsoleGroup).toHaveBeenCalledWith({ id: 'group-id', name: 'test-project' })
      // Should create RO/RW groups
      expect(keycloak.getOrCreateEnvironmentGroups).toHaveBeenCalledWith({ id: 'console-id', name: 'console' }, projectWithEnv.environments[0])
      // Should delete staging group
      expect(keycloak.deleteGroup).toHaveBeenCalledWith('staging-id')
    })

    it('should sync environment permissions', async () => {
      const userRo = makeUserRepresentation({ id: 'user-ro', email: 'ro@example.com' })
      const userRw = makeUserRepresentation({ id: 'user-rw', email: 'rw@example.com' })
      const userNone = makeUserRepresentation({ id: 'user-none', email: 'none@example.com' })

      const projectWithEnvAndMembers = makeProjectWithDetails({
        ...mockProject,
        members: [
          makeProjectMember({
            user: makeProjectUser({ id: userRo.id, email: userRo.email }),
            roleIds: ['role-ro'],
          }),
          makeProjectMember({
            user: makeProjectUser({ id: userRw.id, email: userRw.email }),
            roleIds: ['role-rw'],
          }),
          makeProjectMember({
            user: makeProjectUser({ id: userNone.id, email: userNone.email }),
            roleIds: [],
          }),
        ],
        roles: [
          makeProjectRole({ id: 'role-ro', permissions: 256n, oidcGroup: '', type: 'managed' }),
          makeProjectRole({ id: 'role-rw', permissions: 8n, oidcGroup: '', type: 'managed' }),
        ],
        environments: [makeProjectEnvironment({ id: 'env-1', name: 'dev' })],
      })
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithEnvAndMembers])

      const projectGroup = makeGroupRepresentation({
        id: 'group-id',
        name: 'test-project',
        subGroups: [makeGroupRepresentation({ name: 'console', id: 'console-id' })],
      })
      keycloak.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloak.getOrCreateConsoleGroup.mockResolvedValue(makeGroupRepresentation({ id: 'console-id', name: 'console' }))
      keycloak.getOrCreateEnvironmentGroups.mockResolvedValue({
        roGroup: makeGroupRepresentation({ id: 'dev-ro-id', name: 'RO' }),
        rwGroup: makeGroupRepresentation({ id: 'dev-rw-id', name: 'RW' }),
      })

      // Project group members (assume all are in project group for simplicity)
      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([userRo, userRw, userNone])
        // RO group has userNone (extra), missing userRo
        if (groupId === 'dev-ro-id') return Promise.resolve([userNone])
        // RW group has userNone (extra), missing userRw
        if (groupId === 'dev-rw-id') return Promise.resolve([userNone])
        return Promise.resolve([])
      })

      keycloak.getOrCreateSubGroupByName.mockImplementation((_parentId, name) => {
        if (name === 'console') return Promise.resolve(makeGroupRepresentation({ id: 'console-id', name: 'console' }))
        if (name === 'dev') return Promise.resolve(makeGroupRepresentation({ id: 'dev-id', name: 'dev' }))
        if (name === 'RO') return Promise.resolve(makeGroupRepresentation({ id: 'dev-ro-id', name: 'RO' }))
        if (name === 'RW') return Promise.resolve(makeGroupRepresentation({ id: 'dev-rw-id', name: 'RW' }))
        return Promise.resolve(makeGroupRepresentation({ id: 'new-id', name }))
      })

      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Sync RO
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-ro', 'dev-ro-id')
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-none', 'dev-ro-id')
      // Sync RW
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-rw', 'dev-rw-id')
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-none', 'dev-rw-id')
    })

    it('should handle different role types (managed, external, global)', async () => {
      const roleManaged = makeProjectRole({ id: 'role-managed', permissions: 0n, oidcGroup: '/managed-group', type: 'managed' })
      const roleExternal = makeProjectRole({ id: 'role-external', permissions: 0n, oidcGroup: '/external-group', type: 'external' })
      const roleGlobal = makeProjectRole({ id: 'role-global', permissions: 0n, oidcGroup: '/global-group', type: 'global' })

      const projectWithRoles = makeProjectWithDetails({
        ...mockProject,
        members: [
          makeProjectMember({
            user: makeProjectUser({ id: 'user-1', email: 'user1@example.com' }),
            roleIds: ['role-managed', 'role-external', 'role-global'],
          }),
        ],
        roles: [roleManaged, roleExternal, roleGlobal],
      })
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithRoles])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console' }
      const managedGroup = makeGroupRepresentation({ id: 'managed-id', name: 'managed-group' })
      const externalGroup = makeGroupRepresentation({ id: 'external-id', name: 'external-group' })
      const globalGroup = makeGroupRepresentation({ id: 'global-id', name: 'global-group' })

      keycloak.getOrCreateGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        return Promise.resolve({})
      })
      keycloak.getOrCreateConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.getOrCreateRoleGroup.mockImplementation((_consoleGroup, oidcGroup) => {
        if (oidcGroup === '/managed-group') return Promise.resolve({ ...managedGroup, path: '/console/managed-group' })
        if (oidcGroup === '/external-group') return Promise.resolve({ ...externalGroup, path: '/console/external-group' })
        if (oidcGroup === '/global-group') return Promise.resolve({ ...globalGroup, path: '/console/global-group' })
        return Promise.resolve(makeGroupRepresentation({ id: 'new-id', name: oidcGroup, path: `/console/${oidcGroup}` }))
      })

      // Group members
      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([makeUserRepresentation({ id: 'owner-id' })])

        // Managed: has extra user-2, missing user-1
        if (groupId === 'managed-id') return Promise.resolve([makeUserRepresentation({ id: 'user-2' })])

        // External: has extra user-2, missing user-1
        if (groupId === 'external-id') return Promise.resolve([makeUserRepresentation({ id: 'user-2' })])

        // Global: create group if it doesn't exist but no members
        if (groupId === 'global-id') return Promise.resolve([makeUserRepresentation({ id: 'user-2' })])

        return Promise.resolve([])
      })

      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Managed: should add user-1, remove user-2
      expect(keycloak.getOrCreateRoleGroup).toHaveBeenCalledWith(consoleGroup, '/managed-group')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'managed-id')
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'managed-id')

      // External: should add user-1, NOT remove user-2
      expect(keycloak.getOrCreateRoleGroup).toHaveBeenCalledWith(consoleGroup, '/external-group')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'external-id')
      expect(keycloak.removeUserFromGroup).not.toHaveBeenCalledWith('user-2', 'external-id')

      // Global: should sync group but no members
      expect(keycloak.getOrCreateRoleGroup).toHaveBeenCalledWith(consoleGroup, '/global-group')
    })
  })
})
