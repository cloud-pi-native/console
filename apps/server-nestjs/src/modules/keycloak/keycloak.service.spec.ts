import type { DeepMockProxy } from 'vitest-mock-extended'
import type { AdminRoleWithDetails, ProjectWithDetails, UserWithAdminRoles } from './keycloak-datastore.service'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeAdminRoleEventPayload } from '../events/app-events-testing.utils'
import { KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import {
  makeGroupRepresentation,
  makeProjectEnvironment,
  makeProjectMember,
  makeProjectRole,
  makeProjectUser,
  makeProjectWithDetails,
  makeUserRepresentation,
} from './keycloak-testing.utils'
import { KeycloakService } from './keycloak.service'

describe('keycloakService', () => {
  let service: KeycloakService
  let keycloak: DeepMockProxy<KeycloakClientService>
  let datastore: DeepMockProxy<KeycloakDatastoreService>

  beforeEach(async () => {
    keycloak = mockDeep<KeycloakClientService>({
      ensureConsoleGroup: vi.fn().mockResolvedValue(makeGroupRepresentation({ id: 'console-group-id', name: 'console' })),
      ensureEnvironmentGroups: vi.fn().mockResolvedValue({
        roGroup: makeGroupRepresentation({ id: 'ro-id', name: 'RO' }),
        rwGroup: makeGroupRepresentation({ id: 'rw-id', name: 'RW' }),
      }),
      getAllGroups: vi.fn().mockImplementation(async function* () { /* empty by default */ }),
      deleteGroup: vi.fn().mockResolvedValue(undefined),
    })
    datastore = mockDeep<KeycloakDatastoreService>({
      getAllAdminRoles: vi.fn().mockResolvedValue([]),
      getAllUsersWithAdminRoleIds: vi.fn().mockResolvedValue([]),
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        KeycloakService,
        { provide: KeycloakClientService, useValue: keycloak },
        { provide: KeycloakDatastoreService, useValue: datastore },
      ],
    }).compile()

    service = moduleRef.get(KeycloakService)
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

    it('should not sync system external admin roles', async () => {
      const adminRoles: AdminRoleWithDetails[] = [
        { id: 'admin-role-id', oidcGroup: '/console/system-external', type: 'system:external' },
      ]
      const users: UserWithAdminRoles[] = [
        { id: 'user-1', adminRoleIds: ['admin-role-id'] },
      ]
      datastore.getAllProjects.mockResolvedValue([])
      datastore.getAllAdminRoles.mockResolvedValue(adminRoles)
      datastore.getAllUsersWithAdminRoleIds.mockResolvedValue(users)

      await service.handleCron()

      expect(keycloak.ensureGroupByPath).not.toHaveBeenCalledWith('/console/system-external')
      expect(keycloak.getGroupMembers).not.toHaveBeenCalled()
      expect(keycloak.addUserToGroup).not.toHaveBeenCalled()
      expect(keycloak.removeUserFromGroup).not.toHaveBeenCalled()
    })

    it('should sync admin role groups', async () => {
      const adminRoles: AdminRoleWithDetails[] = [
        { id: 'admin-role-id', oidcGroup: '/console/admin', type: 'managed' },
      ]
      const users: UserWithAdminRoles[] = [
        { id: 'user-1', adminRoleIds: ['admin-role-id'] },
        { id: 'user-2', adminRoleIds: [] },
      ]
      datastore.getAllProjects.mockResolvedValue([])
      datastore.getAllAdminRoles.mockResolvedValue(adminRoles)
      datastore.getAllUsersWithAdminRoleIds.mockResolvedValue(users)

      const adminGroup = makeGroupRepresentation({ id: 'kc-group-id', name: 'admin', path: '/console/admin' })
      keycloak.ensureGroupByPath.mockResolvedValue(adminGroup)

      keycloak.getGroupMembers.mockResolvedValue([
        makeUserRepresentation({ id: 'user-2' }),
      ])

      await service.handleCron()

      expect(keycloak.ensureGroupByPath).toHaveBeenCalledWith('/console/admin')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'kc-group-id')
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'kc-group-id')
    })

    it('should purge orphans', async () => {
      datastore.getAllProjects.mockResolvedValue([mockProject])

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
      keycloak.ensureGroupByPath.mockResolvedValue(projectGroup)
      keycloak.getGroupMembers.mockResolvedValue([])
      keycloak.ensureSubGroupByName.mockResolvedValue(makeGroupRepresentation({ id: 'console-id', name: 'console' }))
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })
      await service.handleCron()

      expect(datastore.getAllProjects).toHaveBeenCalled()
      expect(keycloak.getAllGroups).toHaveBeenCalled()
      expect(keycloak.ensureGroupByPath).toHaveBeenCalledWith('/test-project')
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
      datastore.getAllProjects.mockResolvedValue([projectWithMembers])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      keycloak.ensureGroupByPath.mockResolvedValue(projectGroup)

      // Current members: user-2 (extra), missing user-1
      keycloak.getGroupMembers.mockResolvedValue([
        makeUserRepresentation({ id: 'user-2', email: 'user2@example.com' }),
      ])

      keycloak.ensureSubGroupByName.mockResolvedValue(makeGroupRepresentation({ id: 'console-id', name: 'console' }))
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
        oidcGroup: '/test-project/console/oidc-group',
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
      datastore.getAllProjects.mockResolvedValue([projectWithRole])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const roleGroup = makeGroupRepresentation({ id: 'role-group-id', name: 'oidc-group', path: '/test-project/console/oidc-group' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockResolvedValue(roleGroup)

      // Project members: owner
      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([makeUserRepresentation({ id: 'owner-id' })])
        // Role group members: user-2 (extra), missing user-1
        if (groupId === 'role-group-id') return Promise.resolve([makeUserRepresentation({ id: 'user-2', email: 'user2@example.com' })])
        return Promise.resolve([])
      })

      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Should create/get role group (relative to console group)
      expect(keycloak.ensureRoleGroup).toHaveBeenCalledWith(consoleGroup, '/oidc-group')
      // Should add user-1 to role group
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'role-group-id')
      // Should remove user-2 from role group
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'role-group-id')
    })

    it('should add the owner to the project admin role group', async () => {
      const adminRole = makeProjectRole({
        id: 'role-admin',
        permissions: 0n,
        oidcGroup: '/test-project/console/admin',
        type: 'system:managed',
      })
      const projectWithAdminRole = makeProjectWithDetails({
        ...mockProject,
        members: [],
        roles: [adminRole],
      })
      datastore.getAllProjects.mockResolvedValue([projectWithAdminRole])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const adminGroup = makeGroupRepresentation({ id: 'admin-group-id', name: 'admin', path: '/test-project/console/admin' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockResolvedValue(adminGroup)

      // Owner is in the project group but missing from the admin role group
      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([makeUserRepresentation({ id: 'owner-id' })])
        if (groupId === 'admin-group-id') return Promise.resolve([])
        return Promise.resolve([])
      })

      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Owner implicitly holds the admin role: they must land in the maintainer group
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('owner-id', 'admin-group-id')
    })

    it('should not add the owner to non-admin role groups', async () => {
      const developerRole = makeProjectRole({
        id: 'role-developer',
        permissions: 0n,
        oidcGroup: '/test-project/console/developer',
        type: 'system:managed',
      })
      const projectWithDeveloperRole = makeProjectWithDetails({
        ...mockProject,
        members: [],
        roles: [developerRole],
      })
      datastore.getAllProjects.mockResolvedValue([projectWithDeveloperRole])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const developerGroup = makeGroupRepresentation({ id: 'developer-group-id', name: 'developer', path: '/test-project/console/developer' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockResolvedValue(developerGroup)

      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([makeUserRepresentation({ id: 'owner-id' })])
        if (groupId === 'developer-group-id') return Promise.resolve([])
        return Promise.resolve([])
      })

      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      expect(keycloak.addUserToGroup).not.toHaveBeenCalledWith('owner-id', 'developer-group-id')
    })

    it('should sync environment groups', async () => {
      const projectWithEnv = makeProjectWithDetails({
        ...mockProject,
        environments: [makeProjectEnvironment({ id: 'env-1', name: 'dev' })],
      })
      datastore.getAllProjects.mockResolvedValue([projectWithEnv])

      const projectGroup = makeGroupRepresentation({
        id: 'group-id',
        name: 'test-project',
        subGroups: [makeGroupRepresentation({ name: 'console', id: 'console-id' })],
      })
      keycloak.ensureGroupByPath.mockResolvedValue(projectGroup)
      keycloak.getGroupMembers.mockResolvedValue([])

      // Mock console group retrieval
      const consoleGroup = makeGroupRepresentation({ id: 'console-id', name: 'console', path: '/test-project/console' })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureEnvironmentGroups.mockResolvedValue({
        roGroup: makeGroupRepresentation({ id: 'dev-ro-id', name: 'RO' }),
        rwGroup: makeGroupRepresentation({ id: 'dev-rw-id', name: 'RW' }),
      })
      keycloak.ensureSubGroupByName.mockImplementation((_parentId, name) => {
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
      expect(keycloak.ensureConsoleGroup).toHaveBeenCalledWith(projectGroup)
      // Should create RO/RW groups
      expect(keycloak.ensureEnvironmentGroups).toHaveBeenCalledWith(consoleGroup, projectWithEnv.environments[0])
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
      datastore.getAllProjects.mockResolvedValue([projectWithEnvAndMembers])

      const projectGroup = makeGroupRepresentation({
        id: 'group-id',
        name: 'test-project',
        subGroups: [makeGroupRepresentation({ name: 'console', id: 'console-id' })],
      })
      keycloak.ensureGroupByPath.mockResolvedValue(projectGroup)
      keycloak.ensureConsoleGroup.mockResolvedValue(makeGroupRepresentation({ id: 'console-id', name: 'console', path: '/test-project/console' }))
      keycloak.ensureEnvironmentGroups.mockResolvedValue({
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

      keycloak.ensureSubGroupByName.mockImplementation((_parentId, name) => {
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
      const roleManaged = makeProjectRole({ id: 'role-managed', permissions: 0n, oidcGroup: '/test-project/console/managed-group', type: 'managed' })
      const roleExternal = makeProjectRole({ id: 'role-external', permissions: 0n, oidcGroup: '/test-project/console/external-group', type: 'external' })
      const roleGlobal = makeProjectRole({ id: 'role-global', permissions: 0n, oidcGroup: '/test-project/console/global-group', type: 'global' })

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
      datastore.getAllProjects.mockResolvedValue([projectWithRoles])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const managedGroup = makeGroupRepresentation({ id: 'managed-id', name: 'managed-group' })
      const externalGroup = makeGroupRepresentation({ id: 'external-id', name: 'external-group' })
      const globalGroup = makeGroupRepresentation({ id: 'global-id', name: 'global-group' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockImplementation((_consoleGroup, oidcGroup) => {
        if (oidcGroup === '/managed-group') return Promise.resolve({ ...managedGroup, path: '/test-project/console/managed-group' })
        if (oidcGroup === '/external-group') return Promise.resolve({ ...externalGroup, path: '/test-project/console/external-group' })
        if (oidcGroup === '/global-group') return Promise.resolve({ ...globalGroup, path: '/test-project/console/global-group' })
        return Promise.resolve(makeGroupRepresentation({ id: 'new-id', name: oidcGroup, path: `/test-project/console/${oidcGroup}` }))
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
      expect(keycloak.ensureRoleGroup).toHaveBeenCalledWith(consoleGroup, '/managed-group')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'managed-id')
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'managed-id')

      // External: should add user-1, NOT remove user-2
      expect(keycloak.ensureRoleGroup).toHaveBeenCalledWith(consoleGroup, '/external-group')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'external-id')
      expect(keycloak.removeUserFromGroup).not.toHaveBeenCalledWith('user-2', 'external-id')

      // Global: should sync group but no members
      expect(keycloak.ensureRoleGroup).toHaveBeenCalledWith(consoleGroup, '/global-group')
    })

    it('should treat system-prefixed role types as their base type', async () => {
      const roleSystemManaged = makeProjectRole({ id: 'role-system-managed', permissions: 0n, oidcGroup: '/test-project/console/system-managed-group', type: 'system:managed' })

      const projectWithRoles = makeProjectWithDetails({
        ...mockProject,
        members: [
          makeProjectMember({
            user: makeProjectUser({ id: 'user-1', email: 'user1@example.com' }),
            roleIds: ['role-system-managed'],
          }),
        ],
        roles: [roleSystemManaged],
      })
      datastore.getAllProjects.mockResolvedValue([projectWithRoles])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const systemManagedGroup = makeGroupRepresentation({ id: 'system-managed-id', name: 'system-managed-group' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockResolvedValue({ ...systemManagedGroup, path: '/test-project/console/system-managed-group' })

      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([makeUserRepresentation({ id: 'owner-id' })])

        // has extra user-2, missing user-1
        if (groupId === 'system-managed-id') return Promise.resolve([makeUserRepresentation({ id: 'user-2' })])
        return Promise.resolve([])
      })

      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // system:managed behaves like managed: add user-1, remove user-2
      expect(keycloak.ensureRoleGroup).toHaveBeenCalledWith(consoleGroup, '/system-managed-group')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'system-managed-id')
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'system-managed-id')
    })
  })

  describe('handleAdminRoleUpsert', () => {
    it('should sync the impacted role group on adminRole.upsert', async () => {
      datastore.getAllAdminRoles.mockResolvedValue([{ id: 'role-1', oidcGroup: '/console/admin', type: 'global' }])
      datastore.getAllUsersWithAdminRoleIds.mockResolvedValue([{ id: 'user-1', adminRoleIds: ['role-1'] }])
      keycloak.getOrCreateGroupByPath.mockResolvedValue(makeGroupRepresentation({ id: 'kc-group-id', name: 'admin' }))
      keycloak.getGroupMembers.mockResolvedValue([makeUserRepresentation({ id: 'user-2' })])

      await service.handleAdminRoleUpsert(makeAdminRoleEventPayload({ id: 'role-1', oidcGroup: '/console/admin', members: [] }))

      expect(keycloak.getOrCreateGroupByPath).toHaveBeenCalledWith('/console/admin')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'kc-group-id')
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'kc-group-id')
    })
  })

  describe('handleAdminRoleDelete', () => {
    it('should warn and no-op when the role no longer exists', async () => {
      await service.handleAdminRoleDelete(makeAdminRoleEventPayload({ id: 'gone', oidcGroup: '/console/admin', members: [] }))

      expect(keycloak.getOrCreateGroupByPath).not.toHaveBeenCalled()
    })
  })
})
