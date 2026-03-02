import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest'
import { KeycloakControllerService } from './keycloak-controller.service'
import type { KeycloakDatastoreService, ProjectWithDetails } from './keycloak-datastore.service'
import type { KeycloakService } from './keycloak.service'
import type { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

describe('keycloakControllerService', () => {
  let service: KeycloakControllerService
  let keycloakService: Mocked<KeycloakService>
  let keycloakDatastore: Mocked<KeycloakDatastoreService>
  let configService: Mocked<ConfigurationService>

  const mockKeycloakService = {
    getAllGroups: vi.fn(),
    deleteGroup: vi.fn().mockResolvedValue(undefined),
    getOrCreateGroupByPath: vi.fn().mockResolvedValue({}),
    getGroupMembers: vi.fn().mockResolvedValue([]),
    addUserToGroup: vi.fn().mockResolvedValue(undefined),
    removeUserFromGroup: vi.fn().mockResolvedValue(undefined),
    getOrCreateChildGroupByName: vi.fn().mockResolvedValue({}),
    getSubgroups: vi.fn(),
  } as unknown as Mocked<KeycloakService>

  const mockKeycloakDatastore = {
    getAllProjects: vi.fn(),
  } as unknown as Mocked<KeycloakDatastoreService>

  const mockConfigService = {
    keycloakControllerPurgeOrphans: false,
  } as unknown as Mocked<ConfigurationService>

  beforeEach(async () => {
    service = new KeycloakControllerService(
      mockKeycloakService,
      mockKeycloakDatastore,
      mockConfigService,
    )
    keycloakService = mockKeycloakService
    keycloakDatastore = mockKeycloakDatastore
    configService = mockConfigService

    vi.clearAllMocks()
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

    it('should purge orphans if enabled', async () => {
      // Setup
      configService.keycloakControllerPurgeOrphans = true
      mockKeycloakDatastore.getAllProjects.mockResolvedValue([mockProject])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [] }
      const orphanGroup = { id: 'orphan-id', name: 'orphan-project', subGroups: [{ name: 'console' }] }

      mockKeycloakService.getAllGroups.mockImplementation(async function* () {
        yield projectGroup
        yield orphanGroup
      })
      mockKeycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      mockKeycloakService.getGroupMembers.mockResolvedValue([])
      mockKeycloakService.getOrCreateChildGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      mockKeycloakService.getSubgroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      expect(keycloakDatastore.getAllProjects).toHaveBeenCalled()
      expect(keycloakService.getAllGroups).toHaveBeenCalled()
      expect(keycloakService.getOrCreateGroupByPath).toHaveBeenCalledWith('/test-project')
      expect(keycloakService.deleteGroup).toHaveBeenCalledWith('orphan-id')
    })

    it('should not purge orphans if disabled', async () => {
      // Setup
      configService.keycloakControllerPurgeOrphans = false
      mockKeycloakDatastore.getAllProjects.mockResolvedValue([mockProject])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [] }
      const orphanGroup = { id: 'orphan-id', name: 'orphan-project', subGroups: [{ name: 'console' }] }

      mockKeycloakService.getAllGroups.mockImplementation(async function* () {
        yield projectGroup
        yield orphanGroup
      })
      mockKeycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      mockKeycloakService.getGroupMembers.mockResolvedValue([])
      mockKeycloakService.getOrCreateChildGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      mockKeycloakService.getSubgroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      expect(keycloakService.deleteGroup).not.toHaveBeenCalled()
    })

    it('should sync project members correctly', async () => {
      // Setup
      configService.keycloakControllerPurgeOrphans = true
      const projectWithMembers = {
        ...mockProject,
        members: [{ user: { id: 'user-1', email: 'user1@example.com' }, roleIds: [] }],
      }
      mockKeycloakDatastore.getAllProjects.mockResolvedValue([projectWithMembers])

      const projectGroup = { id: 'group-id', name: 'test-project' }
      mockKeycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)

      // Current members: user-2 (extra), missing user-1
      mockKeycloakService.getGroupMembers.mockResolvedValue([
        { id: 'user-2', email: 'user2@example.com' },
      ])

      mockKeycloakService.getOrCreateChildGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      mockKeycloakService.getSubgroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Should add missing member
      expect(keycloakService.addUserToGroup).toHaveBeenCalledWith('user-1', 'group-id')
      // Should add owner (missing in group members)
      expect(keycloakService.addUserToGroup).toHaveBeenCalledWith('owner-id', 'group-id')
      // Should remove extra member (purge enabled)
      expect(keycloakService.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'group-id')
    })

    it('should sync OIDC role groups correctly', async () => {
      // Setup
      configService.keycloakControllerPurgeOrphans = true
      const roleWithOidc = {
        id: 'role-oidc',
        permissions: 0n,
        oidcGroup: '/oidc-group',
      }
      const projectWithRole = {
        ...mockProject,
        members: [{ user: { id: 'user-1', email: 'user1@example.com' }, roleIds: ['role-oidc'] }],
        roles: [roleWithOidc],
      }
      mockKeycloakDatastore.getAllProjects.mockResolvedValue([projectWithRole])

      const projectGroup = { id: 'group-id', name: 'test-project' }
      const roleGroup = { id: 'role-group-id', name: 'oidc-group', path: '/oidc-group' }

      mockKeycloakService.getOrCreateGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        if (path === '/oidc-group') return Promise.resolve(roleGroup)
        return Promise.resolve({})
      })

      // Project members: owner
      mockKeycloakService.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([{ id: 'owner-id' }])
        // Role group members: user-2 (extra), missing user-1
        if (groupId === 'role-group-id') return Promise.resolve([{ id: 'user-2', email: 'user2@example.com', groups: ['/oidc-group'] }])
        return Promise.resolve([])
      })

      mockKeycloakService.getOrCreateChildGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      mockKeycloakService.getSubgroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Should create/get role group
      expect(keycloakService.getOrCreateGroupByPath).toHaveBeenCalledWith('/oidc-group')

      // Should add user-1 to role group
      expect(keycloakService.addUserToGroup).toHaveBeenCalledWith('user-1', 'role-group-id')

      // Should remove user-2 from role group (purge enabled)
      expect(keycloakService.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'role-group-id')
    })

    it('should sync environment groups correctly', async () => {
      // Setup
      configService.keycloakControllerPurgeOrphans = true
      const projectWithEnv = {
        ...mockProject,
        environments: [{ id: 'env-1', name: 'dev' }],
      }
      mockKeycloakDatastore.getAllProjects.mockResolvedValue([projectWithEnv])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [{ name: 'console', id: 'console-id' }] }
      mockKeycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      mockKeycloakService.getGroupMembers.mockResolvedValue([])

      // Mock console group retrieval
      mockKeycloakService.getOrCreateChildGroupByName.mockImplementation((_parentId, name) => {
        if (name === 'console') return Promise.resolve({ id: 'console-id', name: 'console' })
        if (name === 'dev') return Promise.resolve({ id: 'dev-id', name: 'dev' })
        if (name === 'RO') return Promise.resolve({ id: 'dev-ro-id', name: 'RO' })
        if (name === 'RW') return Promise.resolve({ id: 'dev-rw-id', name: 'RW' })
        return Promise.resolve({ id: 'new-id', name })
      })

      // Mock existing environments: 'staging' (extra)
      mockKeycloakService.getSubgroups.mockImplementation(async function* (parentId) {
        if (parentId === 'console-id') {
          yield { id: 'staging-id', name: 'staging' }
        }
      })

      await service.handleCron()

      // Should create dev group
      expect(keycloakService.getOrCreateChildGroupByName).toHaveBeenCalledWith('console-id', 'dev')
      // Should create RO/RW groups
      expect(keycloakService.getOrCreateChildGroupByName).toHaveBeenCalledWith('dev-id', 'RO')
      expect(keycloakService.getOrCreateChildGroupByName).toHaveBeenCalledWith('dev-id', 'RW')
      // Should delete staging group (purge enabled)
      expect(keycloakService.deleteGroup).toHaveBeenCalledWith('staging-id')
    })

    it('should sync environment permissions correctly', async () => {
      // Setup
      configService.keycloakControllerPurgeOrphans = true

      const userRo = { id: 'user-ro', email: 'ro@example.com' }
      const userRw = { id: 'user-rw', email: 'rw@example.com' }
      const userNone = { id: 'user-none', email: 'none@example.com' }

      const projectWithEnvAndMembers = {
        id: mockProject.id,
        slug: mockProject.slug,
        ownerId: mockProject.ownerId,
        everyonePerms: mockProject.everyonePerms,
        members: [
          { userId: userRo.id, user: userRo, roleIds: ['role-ro'] },
          { userId: userRw.id, user: userRw, roleIds: ['role-rw'] },
          { userId: userNone.id, user: userNone, roleIds: [] },
        ],
        roles: [
          { id: 'role-ro', permissions: BigInt(256), oidcGroup: '' }, // ListEnvironments (bit 8)
          { id: 'role-rw', permissions: BigInt(8), oidcGroup: '' }, // ManageEnvironments (bit 3)
        ],
        environments: [{ id: 'env-1', name: 'dev' }],
      }
      mockKeycloakDatastore.getAllProjects.mockResolvedValue([projectWithEnvAndMembers])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [{ name: 'console', id: 'console-id' }] }
      mockKeycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)

      // Project group members (assume all are in project group for simplicity)
      mockKeycloakService.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([userRo, userRw, userNone])
        // RO group has userNone (extra), missing userRo
        if (groupId === 'dev-ro-id') return Promise.resolve([userNone])
        // RW group has userNone (extra), missing userRw
        if (groupId === 'dev-rw-id') return Promise.resolve([userNone])
        return Promise.resolve([])
      })

      mockKeycloakService.getOrCreateChildGroupByName.mockImplementation((_parentId, name) => {
        if (name === 'console') return Promise.resolve({ id: 'console-id', name: 'console' })
        if (name === 'dev') return Promise.resolve({ id: 'dev-id', name: 'dev' })
        if (name === 'RO') return Promise.resolve({ id: 'dev-ro-id', name: 'RO' })
        if (name === 'RW') return Promise.resolve({ id: 'dev-rw-id', name: 'RW' })
        return Promise.resolve({ id: 'new-id', name })
      })

      mockKeycloakService.getSubgroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Sync RO
      expect(keycloakService.addUserToGroup).toHaveBeenCalledWith('user-ro', 'dev-ro-id')
      expect(keycloakService.removeUserFromGroup).toHaveBeenCalledWith('user-none', 'dev-ro-id')

      // Sync RW
      expect(keycloakService.addUserToGroup).toHaveBeenCalledWith('user-rw', 'dev-rw-id')
      expect(keycloakService.removeUserFromGroup).toHaveBeenCalledWith('user-none', 'dev-rw-id')
    })
  })
})
