import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest'
import { KeycloakControllerService } from './keycloak-controller.service'
import { KeycloakDatastoreService, type ProjectWithDetails } from './keycloak-datastore.service'
import { KeycloakService } from './keycloak.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

function createKeycloakControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      KeycloakControllerService,
      {
        provide: KeycloakService,
        useValue: {
          getAllGroups: vi.fn().mockImplementation(async function* () {}),
          deleteGroup: vi.fn().mockResolvedValue(undefined),
          getOrCreateGroupByPath: vi.fn().mockResolvedValue({}),
          getGroupMembers: vi.fn().mockResolvedValue([]),
          addUserToGroup: vi.fn().mockResolvedValue(undefined),
          removeUserFromGroup: vi.fn().mockResolvedValue(undefined),
          getOrCreateSubGroupByName: vi.fn().mockResolvedValue({}),
          getSubGroups: vi.fn().mockImplementation(async function* () {}),
          getOrCreateConsoleGroup: vi.fn().mockResolvedValue({ id: 'console-group-id', name: 'console' }),
          getOrCreateEnvironmentGroups: vi.fn().mockResolvedValue({
            roGroup: { id: 'ro-id', name: 'RO' },
            rwGroup: { id: 'rw-id', name: 'RW' },
          }),
        } satisfies Partial<KeycloakService>,
      },
      {
        provide: KeycloakDatastoreService,
        useValue: {
          getAllProjects: vi.fn().mockResolvedValue([]),
        } satisfies Partial<KeycloakDatastoreService>,
      },
    ],
  })
}

describe('keycloakControllerService', () => {
  let service: KeycloakControllerService
  let keycloak: Mocked<KeycloakService>
  let keycloakDatastore: Mocked<KeycloakDatastoreService>

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await createKeycloakControllerServiceTestingModule().compile()
    service = module.get(KeycloakControllerService)
    keycloak = module.get(KeycloakService)
    keycloakDatastore = module.get(KeycloakDatastoreService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('reconcile', () => {
    const mockProject: ProjectWithDetails = {
      id: 'project-id',
      slug: 'test-project',
      ownerId: 'owner-id',
      everyonePerms: 0n,
      members: [],
      roles: [],
      environments: [],
    }

    it('should purge orphans', async () => {
      // Setup
      keycloakDatastore.getAllProjects.mockResolvedValue([mockProject])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [] }
      const orphanGroup = { id: 'orphan-id', name: 'orphan-project', subGroups: [{ name: 'console' }] }

      keycloak.getAllGroups.mockImplementation(async function* () {
        yield projectGroup
        yield orphanGroup
      })
      keycloak.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloak.getGroupMembers.mockResolvedValue([])
      keycloak.getOrCreateSubGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })
      await service.handleCron()

      expect(keycloakDatastore.getAllProjects).toHaveBeenCalled()
      expect(keycloak.getAllGroups).toHaveBeenCalled()
      expect(keycloak.getOrCreateGroupByPath).toHaveBeenCalledWith('/test-project')
      expect(keycloak.deleteGroup).toHaveBeenCalledWith('orphan-id')
    })

    it('should sync project members', async () => {
      // Setup
      const projectWithMembers = {
        ...mockProject,
        members: [{ user: { id: 'user-1', email: 'user1@example.com' }, roleIds: [] }],
      }
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithMembers])

      const projectGroup = { id: 'group-id', name: 'test-project' }
      keycloak.getOrCreateGroupByPath.mockResolvedValue(projectGroup)

      // Current members: user-2 (extra), missing user-1
      keycloak.getGroupMembers.mockResolvedValue([
        { id: 'user-2', email: 'user2@example.com' },
      ])

      keycloak.getOrCreateSubGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
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
      // Setup
      const roleWithOidc = {
        id: 'role-oidc',
        permissions: 0n,
        oidcGroup: '/oidc-group',
        type: 'managed',
      }
      const projectWithRole = {
        ...mockProject,
        members: [{ user: { id: 'user-1', email: 'user1@example.com' }, roleIds: ['role-oidc'] }],
        roles: [roleWithOidc],
      }
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithRole])

      const projectGroup = { id: 'group-id', name: 'test-project' }
      const roleGroup = { id: 'role-group-id', name: 'oidc-group', path: '/oidc-group' }

      keycloak.getOrCreateGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        if (path === '/oidc-group') return Promise.resolve(roleGroup)
        return Promise.resolve({})
      })

      // Project members: owner
      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([{ id: 'owner-id' }])
        // Role group members: user-2 (extra), missing user-1
        if (groupId === 'role-group-id') return Promise.resolve([{ id: 'user-2', email: 'user2@example.com', groups: ['/oidc-group'] }])
        return Promise.resolve([])
      })

      keycloak.getOrCreateSubGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Should create/get role group
      expect(keycloak.getOrCreateGroupByPath).toHaveBeenCalledWith('/oidc-group')
      // Should add user-1 to role group
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'role-group-id')
      // Should remove user-2 from role group
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'role-group-id')
    })

    it('should sync environment groups', async () => {
      // Setup
      const projectWithEnv = {
        ...mockProject,
        environments: [{ id: 'env-1', name: 'dev' }],
      }
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithEnv])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [{ name: 'console', id: 'console-id' }] }
      keycloak.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloak.getGroupMembers.mockResolvedValue([])

      // Mock console group retrieval
      keycloak.getOrCreateConsoleGroup.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloak.getOrCreateEnvironmentGroups.mockResolvedValue({
        roGroup: { id: 'dev-ro-id', name: 'RO' },
        rwGroup: { id: 'dev-rw-id', name: 'RW' },
      })
      keycloak.getOrCreateSubGroupByName.mockImplementation((_parentId, name) => {
        if (name === 'console') return Promise.resolve({ id: 'console-id', name: 'console' })
        if (name === 'dev') return Promise.resolve({ id: 'dev-id', name: 'dev' })
        if (name === 'RO') return Promise.resolve({ id: 'dev-ro-id', name: 'RO' })
        if (name === 'RW') return Promise.resolve({ id: 'dev-rw-id', name: 'RW' })
        return Promise.resolve({ id: 'new-id', name })
      })

      // Mock existing environments: 'staging' (extra)
      keycloak.getSubGroups.mockImplementation(async function* (parentId) {
        if (parentId === 'console-id') {
          yield { id: 'staging-id', name: 'staging' }
        }
      })

      await service.handleCron()

      // Should create dev group
      expect(keycloak.getOrCreateConsoleGroup).toHaveBeenCalledWith({ id: 'group-id', name: 'test-project' })
      // Should create RO/RW groups
      expect(keycloak.getOrCreateEnvironmentGroups).toHaveBeenCalledWith({ id: 'console-id' }, projectWithEnv.environments[0])
      // Should delete staging group
      expect(keycloak.deleteGroup).toHaveBeenCalledWith('staging-id')
    })

    it('should sync environment permissions', async () => {
      // Setup

      const userRo = { id: 'user-ro', email: 'ro@example.com' }
      const userRw = { id: 'user-rw', email: 'rw@example.com' }
      const userNone = { id: 'user-none', email: 'none@example.com' }

      const projectWithEnvAndMembers = {
        id: mockProject.id,
        slug: mockProject.slug,
        ownerId: mockProject.ownerId,
        everyonePerms: mockProject.everyonePerms,
        plugins: [],
        members: [
          { userId: userRo.id, user: userRo, roleIds: ['role-ro'] },
          { userId: userRw.id, user: userRw, roleIds: ['role-rw'] },
          { userId: userNone.id, user: userNone, roleIds: [] },
        ],
        roles: [
          { id: 'role-ro', permissions: BigInt(256), oidcGroup: '', type: 'managed' }, // ListEnvironments (bit 8)
          { id: 'role-rw', permissions: BigInt(8), oidcGroup: '', type: 'managed' }, // ManageEnvironments (bit 3)
        ],
        environments: [{ id: 'env-1', name: 'dev' }],
      }
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithEnvAndMembers])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [{ name: 'console', id: 'console-id' }] }
      keycloak.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloak.getOrCreateConsoleGroup.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloak.getOrCreateEnvironmentGroups.mockResolvedValue({
        roGroup: { id: 'dev-ro-id', name: 'RO' },
        rwGroup: { id: 'dev-rw-id', name: 'RW' },
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
        if (name === 'console') return Promise.resolve({ id: 'console-id', name: 'console' })
        if (name === 'dev') return Promise.resolve({ id: 'dev-id', name: 'dev' })
        if (name === 'RO') return Promise.resolve({ id: 'dev-ro-id', name: 'RO' })
        if (name === 'RW') return Promise.resolve({ id: 'dev-rw-id', name: 'RW' })
        return Promise.resolve({ id: 'new-id', name })
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
      // Setup
      const roleManaged = {
        id: 'role-managed',
        permissions: 0n,
        oidcGroup: '/managed-group',
        type: 'managed',
      }
      const roleExternal = {
        id: 'role-external',
        permissions: 0n,
        oidcGroup: '/external-group',
        type: 'external',
      }
      const roleGlobal = {
        id: 'role-global',
        permissions: 0n,
        oidcGroup: '/global-group',
        type: 'global',
      }

      const projectWithRoles = {
        ...mockProject,
        members: [{ user: { id: 'user-1', email: 'user1@example.com' }, roleIds: ['role-managed', 'role-external', 'role-global'] }],
        roles: [roleManaged, roleExternal, roleGlobal],
      }
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithRoles])

      const projectGroup = { id: 'group-id', name: 'test-project' }
      const managedGroup = { id: 'managed-id', name: 'managed-group', path: '/managed-group' }
      const externalGroup = { id: 'external-id', name: 'external-group', path: '/external-group' }
      const globalGroup = { id: 'global-id', name: 'global-group', path: '/global-group' }

      keycloak.getOrCreateGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        if (path === '/managed-group') return Promise.resolve(managedGroup)
        if (path === '/external-group') return Promise.resolve(externalGroup)
        if (path === '/global-group') return Promise.resolve(globalGroup)
        return Promise.resolve({})
      })

      // Group members
      keycloak.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([{ id: 'owner-id' }])

        // Managed: has extra user-2, missing user-1
        if (groupId === 'managed-id') return Promise.resolve([{ id: 'user-2', groups: ['/managed-group'] }])

        // External: has extra user-2, missing user-1
        if (groupId === 'external-id') return Promise.resolve([{ id: 'user-2', groups: ['/external-group'] }])

        // Global: create group if it doesn't exist but no members
        if (groupId === 'global-id') return Promise.resolve([{ id: 'user-2', groups: ['/global-group'] }])

        return Promise.resolve([])
      })

      keycloak.getOrCreateSubGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloak.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Managed: should add user-1, remove user-2
      expect(keycloak.getOrCreateGroupByPath).toHaveBeenCalledWith('/managed-group')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'managed-id')
      expect(keycloak.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'managed-id')

      // External: should add user-1, NOT remove user-2
      expect(keycloak.getOrCreateGroupByPath).toHaveBeenCalledWith('/external-group')
      expect(keycloak.addUserToGroup).toHaveBeenCalledWith('user-1', 'external-id')
      expect(keycloak.removeUserFromGroup).not.toHaveBeenCalledWith('user-2', 'external-id')

      // Global: should sync group but no members
      expect(keycloak.getOrCreateGroupByPath).toHaveBeenCalledWith('/global-group')
    })
  })
})
