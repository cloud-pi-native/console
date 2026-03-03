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
          getSubGroups: vi.fn(),
          getOrCreateConsoleGroup: vi.fn().mockResolvedValue({}),
          getOrCreateEnvironmentGroups: vi.fn().mockResolvedValue({}),
        } satisfies Partial<KeycloakService>,
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
          keycloakControllerPurgeOrphans: false,
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('keycloakControllerService', () => {
  let service: KeycloakControllerService
  let keycloakService: Mocked<KeycloakService>
  let keycloakDatastore: Mocked<KeycloakDatastoreService>
  let configService: Mocked<ConfigurationService>

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await createKeycloakControllerServiceTestingModule().compile()
    service = module.get(KeycloakControllerService)
    keycloakService = module.get(KeycloakService)
    keycloakDatastore = module.get(KeycloakDatastoreService)
    configService = module.get(ConfigurationService)
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
      keycloakDatastore.getAllProjects.mockResolvedValue([mockProject])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [] }
      const orphanGroup = { id: 'orphan-id', name: 'orphan-project', subGroups: [{ name: 'console' }] }

      keycloakService.getAllGroups.mockImplementation(async function* () {
        yield projectGroup
        yield orphanGroup
      })
      keycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloakService.getGroupMembers.mockResolvedValue([])
      keycloakService.getOrCreateSubGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      await service.handleCron()

      expect(keycloakDatastore.getAllProjects).toHaveBeenCalled()
      expect(keycloakService.getAllGroups).toHaveBeenCalled()
      expect(keycloakService.getOrCreateGroupByPath).toHaveBeenCalledWith('/test-project')
      expect(keycloakService.deleteGroup).toHaveBeenCalledWith('orphan-id')
    })

    it('should not purge orphans if disabled', async () => {
      // Setup
      configService.keycloakControllerPurgeOrphans = false
      keycloakDatastore.getAllProjects.mockResolvedValue([mockProject])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [] }
      const orphanGroup = { id: 'orphan-id', name: 'orphan-project', subGroups: [{ name: 'console' }] }

      keycloakService.getAllGroups.mockImplementation(async function* () {
        yield projectGroup
        yield orphanGroup
      })
      keycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloakService.getGroupMembers.mockResolvedValue([])
      keycloakService.getOrCreateSubGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloakService.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      expect(keycloakService.deleteGroup).not.toHaveBeenCalled()
    })

    it('should sync project members', async () => {
      // Setup
      configService.keycloakControllerPurgeOrphans = true
      const projectWithMembers = {
        ...mockProject,
        members: [{ user: { id: 'user-1', email: 'user1@example.com' }, roleIds: [] }],
      }
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithMembers])

      const projectGroup = { id: 'group-id', name: 'test-project' }
      keycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)

      // Current members: user-2 (extra), missing user-1
      keycloakService.getGroupMembers.mockResolvedValue([
        { id: 'user-2', email: 'user2@example.com' },
      ])

      keycloakService.getOrCreateSubGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloakService.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Should add missing member
      expect(keycloakService.addUserToGroup).toHaveBeenCalledWith('user-1', 'group-id')
      // Should add owner (missing in group members)
      expect(keycloakService.addUserToGroup).toHaveBeenCalledWith('owner-id', 'group-id')
      // Should remove extra member (purge enabled)
      expect(keycloakService.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'group-id')
    })

    it('should sync OIDC role groups', async () => {
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
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithRole])

      const projectGroup = { id: 'group-id', name: 'test-project' }
      const roleGroup = { id: 'role-group-id', name: 'oidc-group', path: '/oidc-group' }

      keycloakService.getOrCreateGroupByPath.mockImplementation((path) => {
        if (path === '/test-project') return Promise.resolve(projectGroup)
        if (path === '/oidc-group') return Promise.resolve(roleGroup)
        return Promise.resolve({})
      })

      // Project members: owner
      keycloakService.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([{ id: 'owner-id' }])
        // Role group members: user-2 (extra), missing user-1
        if (groupId === 'role-group-id') return Promise.resolve([{ id: 'user-2', email: 'user2@example.com', groups: ['/oidc-group'] }])
        return Promise.resolve([])
      })

      keycloakService.getOrCreateSubGroupByName.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloakService.getSubGroups.mockImplementation(async function* () { /* empty */ })

      await service.handleCron()

      // Should create/get role group
      expect(keycloakService.getOrCreateGroupByPath).toHaveBeenCalledWith('/oidc-group')
      // Should add user-1 to role group
      expect(keycloakService.addUserToGroup).toHaveBeenCalledWith('user-1', 'role-group-id')
      // Should remove user-2 from role group (purge enabled)
      expect(keycloakService.removeUserFromGroup).toHaveBeenCalledWith('user-2', 'role-group-id')
    })

    it('should sync environment groups', async () => {
      // Setup
      configService.keycloakControllerPurgeOrphans = true
      const projectWithEnv = {
        ...mockProject,
        environments: [{ id: 'env-1', name: 'dev' }],
      }
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithEnv])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [{ name: 'console', id: 'console-id' }] }
      keycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloakService.getGroupMembers.mockResolvedValue([])

      // Mock console group retrieval
      keycloakService.getOrCreateConsoleGroup.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloakService.getOrCreateEnvironmentGroups.mockResolvedValue({
        roGroup: { id: 'dev-ro-id', name: 'RO' },
        rwGroup: { id: 'dev-rw-id', name: 'RW' },
      })
      keycloakService.getOrCreateSubGroupByName.mockImplementation((_parentId, name) => {
        if (name === 'console') return Promise.resolve({ id: 'console-id', name: 'console' })
        if (name === 'dev') return Promise.resolve({ id: 'dev-id', name: 'dev' })
        if (name === 'RO') return Promise.resolve({ id: 'dev-ro-id', name: 'RO' })
        if (name === 'RW') return Promise.resolve({ id: 'dev-rw-id', name: 'RW' })
        return Promise.resolve({ id: 'new-id', name })
      })

      // Mock existing environments: 'staging' (extra)
      keycloakService.getSubGroups.mockImplementation(async function* (parentId) {
        if (parentId === 'console-id') {
          yield { id: 'staging-id', name: 'staging' }
        }
      })

      await service.handleCron()

      // Should create dev group
      expect(keycloakService.getOrCreateConsoleGroup).toHaveBeenCalledWith(projectGroup)
      // Should create RO/RW groups
      expect(keycloakService.getOrCreateEnvironmentGroups).toHaveBeenCalledWith({ id: 'console-id', name: 'console' }, projectWithEnv.environments[0])
      // Should delete staging group (purge enabled)
      expect(keycloakService.deleteGroup).toHaveBeenCalledWith('staging-id')
    })

    it('should sync environment permissions', async () => {
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
      keycloakDatastore.getAllProjects.mockResolvedValue([projectWithEnvAndMembers])

      const projectGroup = { id: 'group-id', name: 'test-project', subGroups: [{ name: 'console', id: 'console-id' }] }
      keycloakService.getOrCreateGroupByPath.mockResolvedValue(projectGroup)
      keycloakService.getOrCreateConsoleGroup.mockResolvedValue({ id: 'console-id', name: 'console' })
      keycloakService.getOrCreateEnvironmentGroups.mockResolvedValue({
        roGroup: { id: 'dev-ro-id', name: 'RO' },
        rwGroup: { id: 'dev-rw-id', name: 'RW' },
      })

      // Project group members (assume all are in project group for simplicity)
      keycloakService.getGroupMembers.mockImplementation((groupId) => {
        if (groupId === 'group-id') return Promise.resolve([userRo, userRw, userNone])
        // RO group has userNone (extra), missing userRo
        if (groupId === 'dev-ro-id') return Promise.resolve([userNone])
        // RW group has userNone (extra), missing userRw
        if (groupId === 'dev-rw-id') return Promise.resolve([userNone])
        return Promise.resolve([])
      })

      keycloakService.getOrCreateSubGroupByName.mockImplementation((_parentId, name) => {
        if (name === 'console') return Promise.resolve({ id: 'console-id', name: 'console' })
        if (name === 'dev') return Promise.resolve({ id: 'dev-id', name: 'dev' })
        if (name === 'RO') return Promise.resolve({ id: 'dev-ro-id', name: 'RO' })
        if (name === 'RW') return Promise.resolve({ id: 'dev-rw-id', name: 'RW' })
        return Promise.resolve({ id: 'new-id', name })
      })

      keycloakService.getSubGroups.mockImplementation(async function* () { /* empty */ })

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
