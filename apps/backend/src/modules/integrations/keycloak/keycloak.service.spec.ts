import type { DeepMockProxy } from 'vitest-mock-extended'
import type { AdminRoleWithDetails, ProjectWithDetails, UserWithAdminRoles } from './keycloak-datastore.service'
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeAdminRoleEventPayload } from '../../core/events/app-events-testing.utils'
import { KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import {
  makeGroupRepresentation,
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
  let events: EventEmitter2

  beforeEach(async () => {
    keycloak = mockDeep<KeycloakClientService>({
      ensureConsoleGroup: vi.fn().mockResolvedValue(makeGroupRepresentation({ id: 'console-group-id', name: 'console', path: '/test-project/console' })),
      ensureRoleGroup: vi.fn().mockImplementation((_consoleGroup, oidcGroup) =>
        Promise.resolve(makeGroupRepresentation({ id: `group-${oidcGroup.replaceAll('/', '-')}`, name: oidcGroup.replace(/^\//, ''), path: `/test-project/console${oidcGroup}` })),
      ),
      getGroupMembers: vi.fn().mockResolvedValue([]),
      addUserToGroup: vi.fn().mockResolvedValue(undefined),
      getAllGroups: vi.fn().mockImplementation(async function* () { /* empty by default */ }),
      deleteGroup: vi.fn().mockResolvedValue(undefined),
    })
    datastore = mockDeep<KeycloakDatastoreService>({
      getAllAdminRoles: vi.fn().mockResolvedValue([]),
      getAllUsersWithAdminRoleIds: vi.fn().mockResolvedValue([]),
    })

    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        KeycloakService,
        { provide: KeycloakClientService, useValue: keycloak },
        { provide: KeycloakDatastoreService, useValue: datastore },
      ],
    }).compile()

    await moduleRef.init()
    service = moduleRef.get(KeycloakService)
    events = moduleRef.get(EventEmitter2)
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

      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([makeUserRepresentation({ id: 'owner-id' })])
        if (groupId === 'admin-group-id') return Promise.resolve([])
        return Promise.resolve([])
      })

      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('owner-id', 'admin-group-id')
    })

    it('should add the owner to the virtual /console/owner group even without an owner role', async () => {
      const adminRole = makeProjectRole({
        id: 'role-admin',
        permissions: 0n,
        oidcGroup: '/test-project/console/admin',
        type: 'system:managed',
      })
      const projectNoOwnerRole = makeProjectWithDetails({
        ...mockProject,
        members: [],
        roles: [adminRole],
      })
      datastore.getAllProjects.mockResolvedValue([projectNoOwnerRole])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const ownerGroup = makeGroupRepresentation({ id: 'owner-group-id', name: 'owner', path: '/test-project/console/owner' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockImplementation((_cg, oidcGroup) => {
        if (oidcGroup === '/owner') return Promise.resolve(ownerGroup)
        return Promise.resolve(makeGroupRepresentation({ id: 'admin-group-id', name: 'admin', path: '/test-project/console/admin' }))
      })
      keycloak.getGroupMembers.mockResolvedValue([])
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('owner-id', 'owner-group-id')
    })

    it('should keep the holders of a custom role mapped to the virtual /console/owner group', async () => {
      const ownerPathRole = makeProjectRole({
        id: 'role-custom-owner-path',
        permissions: 0n,
        oidcGroup: '/test-project/console/owner',
        type: 'managed',
      })
      const adminRole = makeProjectRole({
        id: 'role-admin',
        permissions: 0n,
        oidcGroup: '/test-project/console/admin',
        type: 'system:managed',
      })
      const projectWithOwnerPathRole = makeProjectWithDetails({
        ...mockProject,
        members: [makeProjectMember({ roleIds: ['role-custom-owner-path'], user: makeProjectUser({ id: 'holder-id' }) })],
        roles: [adminRole, ownerPathRole],
      })
      datastore.getAllProjects.mockResolvedValue([projectWithOwnerPathRole])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const ownerGroup = makeGroupRepresentation({ id: 'owner-group-id', name: 'owner', path: '/test-project/console/owner' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockImplementation((_cg, oidcGroup) => {
        if (oidcGroup === '/owner') return Promise.resolve(ownerGroup)
        return Promise.resolve(makeGroupRepresentation({ id: 'admin-group-id', name: 'admin', path: '/test-project/console/admin' }))
      })
      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([makeUserRepresentation({ id: 'owner-id' })])
        if (groupId === 'owner-group-id') return Promise.resolve([makeUserRepresentation({ id: 'holder-id' })])
        return Promise.resolve([])
      })
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      expect(keycloak.removeUserFromGroup).not.toHaveBeenCalledWith('holder-id', 'owner-group-id')
    })

    it('should remove the previous owner from the virtual /console/owner group on transfer', async () => {
      const adminRole = makeProjectRole({
        id: 'role-admin',
        permissions: 0n,
        oidcGroup: '/test-project/console/admin',
        type: 'system:managed',
      })
      const projectTransferred = makeProjectWithDetails({
        ...mockProject,
        ownerId: 'new-owner-id',
        members: [],
        roles: [adminRole],
      })
      datastore.getAllProjects.mockResolvedValue([projectTransferred])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const ownerGroup = makeGroupRepresentation({ id: 'owner-group-id', name: 'owner', path: '/test-project/console/owner' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockImplementation((_cg, oidcGroup) => {
        if (oidcGroup === '/owner') return Promise.resolve(ownerGroup)
        return Promise.resolve(makeGroupRepresentation({ id: 'admin-group-id', name: 'admin', path: '/test-project/console/admin' }))
      })
      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'owner-group-id') return Promise.resolve([makeUserRepresentation({ id: 'old-owner-id' })])
        return Promise.resolve([])
      })
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('old-owner-id', 'owner-group-id')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('new-owner-id', 'owner-group-id')
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
      keycloak.ensureRoleGroup.mockImplementation((_cg, oidcGroup) => {
        if (oidcGroup === '/owner') return Promise.resolve(makeGroupRepresentation({ id: 'owner-group-id', name: 'owner', path: '/test-project/console/owner' }))
        return Promise.resolve(developerGroup)
      })

      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([makeUserRepresentation({ id: 'owner-id' })])
        return Promise.resolve([])
      })

      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      expect(keycloak.addUserToGroup).not.toHaveBeenCalledWith('owner-id', 'developer-group-id')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('owner-id', 'owner-group-id')
    })

    it('should keep the ancestors of a nested role group when purging orphans', async () => {
      const developerRole = makeProjectRole({
        id: 'role-developer',
        permissions: 0n,
        oidcGroup: '/test-project/console/team/developer',
        type: 'managed',
      })
      const projectWithDeveloperRole = makeProjectWithDetails({
        ...mockProject,
        members: [],
        roles: [developerRole],
      })
      datastore.getAllProjects.mockResolvedValue([projectWithDeveloperRole])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const developerGroup = makeGroupRepresentation({ id: 'developer-group-id', name: 'developer', path: '/test-project/console/team/developer' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockResolvedValue(developerGroup)
      keycloak.getGroupMembers.mockResolvedValue([])

      const teamGroup = makeGroupRepresentation({ id: 'team-group-id', name: 'team', path: '/test-project/console/team' })
      keycloak.getSubGroups.mockImplementation((parentId) => {
        if (parentId === 'console-id') return (async function* () { yield teamGroup })()
        return (async function* () { /* empty */ })()
      })

      await service.handleCron()

      expect(keycloak.deleteGroup).not.toHaveBeenCalled()
    })

    it('should purge a nested orphan group under a kept path', async () => {
      const teamRole = makeProjectRole({
        id: 'role-team',
        permissions: 0n,
        oidcGroup: '/test-project/console/team',
        type: 'managed',
      })
      const projectWithTeamRole = makeProjectWithDetails({
        ...mockProject,
        members: [],
        roles: [teamRole],
      })
      datastore.getAllProjects.mockResolvedValue([projectWithTeamRole])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockResolvedValue(makeGroupRepresentation({ id: 'team-group-id', name: 'team', path: '/test-project/console/team' }))
      keycloak.getGroupMembers.mockResolvedValue([])

      const staleRoleGroup = makeGroupRepresentation({ id: 'stale-role-group-id', name: 'developer' })
      keycloak.getSubGroups.mockImplementation((parentId) => {
        if (parentId === 'console-id') return (async function* () { yield makeGroupRepresentation({ id: 'team-group-id', name: 'team', path: '/test-project/console/team' }) })()
        if (parentId === 'team-group-id') return (async function* () { yield staleRoleGroup })()
        return (async function* () { /* empty */ })()
      })
      keycloak.getGroupByPath.mockResolvedValue(staleRoleGroup)

      await service.handleCron()

      expect(keycloak.deleteGroup).toHaveBeenCalledWith('stale-role-group-id')
    })

    it('should keep every segment of a nested role group across recursion levels', async () => {
      const reviewersRole = makeProjectRole({
        id: 'role-reviewers',
        permissions: 0n,
        oidcGroup: '/test-project/console/team/reviewers',
        type: 'managed',
      })
      const projectWithReviewersRole = makeProjectWithDetails({
        ...mockProject,
        members: [],
        roles: [reviewersRole],
      })
      datastore.getAllProjects.mockResolvedValue([projectWithReviewersRole])

      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project' })
      const consoleGroup = { id: 'console-id', name: 'console', path: '/test-project/console' }
      const reviewersGroup = makeGroupRepresentation({ id: 'reviewers-group-id', name: 'reviewers', path: '/test-project/console/team/reviewers' })

      keycloak.ensureGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        throw new Error(`Unexpected ensureGroupByPath call: ${path}`)
      })
      keycloak.ensureConsoleGroup.mockResolvedValue(consoleGroup)
      keycloak.ensureRoleGroup.mockResolvedValue(reviewersGroup)
      keycloak.getGroupMembers.mockResolvedValue([])

      keycloak.getSubGroups.mockImplementation((parentId) => {
        if (parentId === 'console-id') return (async function* () { yield makeGroupRepresentation({ id: 'team-group-id', name: 'team', path: '/test-project/console/team' }) })()
        if (parentId === 'team-group-id') return (async function* () { yield reviewersGroup })()
        return (async function* () { /* empty */ })()
      })
      keycloak.getGroupByPath.mockResolvedValue(reviewersGroup)

      await service.handleCron()

      expect(keycloak.deleteGroup).not.toHaveBeenCalled()
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

    const mockManagedRoleProject = (roleIds: string[]) => {
      const role = makeProjectRole({
        id: 'role-1',
        permissions: 0n,
        oidcGroup: '/test-project/console/dev',
        type: 'managed',
      })
      datastore.getAllProjects.mockResolvedValue([makeProjectWithDetails({
        id: 'project-id',
        slug: 'test-project',
        ownerId: 'owner-id',
        everyonePerms: 0n,
        roles: [role],
        members: [makeProjectMember({
          user: makeProjectUser({ id: 'user-1', email: 'u1@example.com' }),
          roleIds,
        })],
      })])

      keycloak.ensureGroupByPath.mockResolvedValue(makeGroupRepresentation({ id: 'group-id', name: 'test-project' }))
      keycloak.ensureRoleGroup.mockImplementation((_cg, oidcGroup) => {
        if (oidcGroup === '/owner') {
          return Promise.resolve({
            ...makeGroupRepresentation({ id: 'owner-group-id', name: 'owner' }),
            path: '/test-project/console/owner',
          })
        }
        return Promise.resolve({
          ...makeGroupRepresentation({ id: 'role-group-id', name: 'dev' }),
          path: '/test-project/console/dev',
        })
      })
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })
      keycloak.getGroupMembers.mockImplementation(async (groupId) => {
        if (groupId === 'group-id') return [makeUserRepresentation({ id: 'owner-id' })]
        if (groupId === 'role-group-id') return [makeUserRepresentation({ id: 'user-1' })]
        return []
      })
    }

    it('removes a member still in the project after their role was withdrawn', async () => {
      mockManagedRoleProject([])

      await service.handleCron()

      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-1', 'role-group-id')
    })

    it('keeps a member who still holds the role', async () => {
      mockManagedRoleProject(['role-1'])

      await service.handleCron()

      expect(keycloak.removeUserFromGroup).not.toHaveBeenCalledWith('user-1', 'role-group-id')
    })

    it('keeps a member who still holds another role mapped to the same group', async () => {
      const group = '/test-project/console/dev'
      const roleA = makeProjectRole({ id: 'role-a', permissions: 0n, oidcGroup: group, type: 'managed' })
      const roleB = makeProjectRole({ id: 'role-b', permissions: 0n, oidcGroup: group, type: 'managed' })
      datastore.getAllProjects.mockResolvedValue([makeProjectWithDetails({
        id: 'project-id',
        slug: 'test-project',
        ownerId: 'owner-id',
        everyonePerms: 0n,
        roles: [roleA, roleB],
        members: [makeProjectMember({
          user: makeProjectUser({ id: 'user-1', email: 'u1@example.com' }),
          roleIds: ['role-a'],
        })],
      })])
      keycloak.ensureGroupByPath.mockResolvedValue(makeGroupRepresentation({ id: 'console-group-id', name: 'console' }))
      keycloak.ensureRoleGroup.mockImplementation((_cg, oidcGroup) => {
        if (oidcGroup === '/owner') {
          return Promise.resolve({
            ...makeGroupRepresentation({ id: 'owner-group-id', name: 'owner' }),
            path: '/test-project/console/owner',
          })
        }
        return Promise.resolve({
          ...makeGroupRepresentation({ id: 'role-group-id', name: 'dev' }),
          path: group,
        })
      })
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })
      keycloak.getGroupMembers.mockImplementation(async (groupId) => {
        if (groupId === 'console-group-id') return [makeUserRepresentation({ id: 'owner-id' })]
        if (groupId === 'role-group-id') return [makeUserRepresentation({ id: 'user-1' })]
        return []
      })

      await service.handleCron()

      expect(keycloak.removeUserFromGroup).not.toHaveBeenCalledWith('user-1', 'role-group-id')
    })
  })

  describe('handleUpsert (projectRole.delete regression #3049)', () => {
    it('reconciles OIDC groups when a project role event fires', async () => {
      const project = makeProjectWithDetails({ id: 'project-id', slug: 'test-project', ownerId: 'owner-id', everyonePerms: 0n, members: [], roles: [] })
      datastore.getProject.mockResolvedValue(project)
      const projectGroup = makeGroupRepresentation({ id: 'group-id', name: 'test-project', subGroups: [] })
      keycloak.ensureGroupByPath.mockResolvedValue(projectGroup)
      keycloak.ensureSubGroupByName.mockResolvedValue(makeGroupRepresentation({ id: 'console-id', name: 'console' }))
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })
      keycloak.getGroupMembers.mockResolvedValue([])

      await events.emitAsync('projectRole.delete', { projectId: 'project-id' })

      // #3049: revoking a project role must reach the Keycloak group
      // reconciliation — the granular projectRole.delete routes here.
      expect(datastore.getProject).toHaveBeenCalledWith('project-id')
      expect(keycloak.ensureGroupByPath).toHaveBeenCalledWith('/test-project')
    })
  })

  describe('handleAdminRoleUpsert', () => {
    it('should sync the impacted role group on adminRole.upsert', async () => {
      datastore.getAllAdminRoles.mockResolvedValue([{ id: 'role-1', oidcGroup: '/console/admin', type: 'global' }])
      datastore.getAllUsersWithAdminRoleIds.mockResolvedValue([{ id: 'user-1', adminRoleIds: ['role-1'] }])
      keycloak.ensureGroupByPath.mockResolvedValue(makeGroupRepresentation({ id: 'kc-group-id', name: 'admin' }))
      keycloak.getGroupMembers.mockResolvedValue([makeUserRepresentation({ id: 'user-2' })])

      await service.handleAdminRoleUpsert(makeAdminRoleEventPayload({ id: 'role-1' }))

      expect(keycloak.ensureGroupByPath).toHaveBeenCalledWith('/console/admin')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'kc-group-id')
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'kc-group-id')
    })
  })

  describe('handleAdminRoleDelete', () => {
    it('should warn and no-op when the role no longer exists', async () => {
      await service.handleAdminRoleDelete(makeAdminRoleEventPayload({ id: 'gone' }))

      expect(keycloak.ensureGroupByPath).not.toHaveBeenCalled()
    })
  })
})
