import type { Mocked } from 'vitest'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeDatastoreService } from './sonarqube-datastore.service'
import { makeProjectWithDetails, makeSonarqubePaging, makeSonarqubeUser } from './sonarqube-testing.utils'
import { SonarqubeService } from './sonarqube.service'

function makeEmptyGroupsResponse() {
  return { paging: makeSonarqubePaging(), groups: [] }
}

function makeEmptyUsersResponse() {
  return { paging: makeSonarqubePaging(), users: [] }
}

function makeEmptyProjectsResponse() {
  return { paging: makeSonarqubePaging(), components: [] }
}

function createTestingModule() {
  return Test.createTestingModule({
    providers: [
      SonarqubeService,
      {
        provide: SonarqubeClientService,
        useValue: {
          searchUserGroups: vi.fn(),
          createUserGroups: vi.fn(),
          createPermissionTemplate: vi.fn(),
          setPermissionDefaultTemplate: vi.fn(),
          addPermissionProjectCreatorToTemplate: vi.fn(),
          addPermissionGroupToTemplate: vi.fn(),
          addPermissionGroup: vi.fn(),
          addPermissionUser: vi.fn(),
          searchUsers: vi.fn(),
          createUser: vi.fn(),
          deactivateUser: vi.fn(),
          revokeUserToken: vi.fn(),
          generateUserToken: vi.fn(),
          searchProject: vi.fn(),
          createProject: vi.fn(),
          deleteProject: vi.fn(),
        } satisfies Partial<SonarqubeClientService>,
      },
      {
        provide: SonarqubeDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
          getProject: vi.fn(),
          getAdminPluginConfig: vi.fn(),
        } satisfies Partial<SonarqubeDatastoreService>,
      },
      {
        provide: VaultClientService,
        useValue: {
          readSonarqubeUser: vi.fn(),
          writeSonarqubeUser: vi.fn(),
          deleteSonarqubeUser: vi.fn(),
        } satisfies Partial<VaultClientService>,
      },
      {
        provide: ConfigurationService,
        useValue: {
          projectRootDir: 'forge',
          getInternalOrPublicSonarqubeUrl: () => 'https://sonarqube.internal',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('sonarqubeService', () => {
  let service: SonarqubeService
  let client: Mocked<SonarqubeClientService>
  let datastore: Mocked<SonarqubeDatastoreService>
  let vault: Mocked<VaultClientService>

  beforeEach(async () => {
    const module = await createTestingModule().compile()
    service = module.get(SonarqubeService)
    client = module.get(SonarqubeClientService) as Mocked<SonarqubeClientService>
    datastore = module.get(SonarqubeDatastoreService) as Mocked<SonarqubeDatastoreService>
    vault = module.get(VaultClientService) as Mocked<VaultClientService>

    datastore.getAdminPluginConfig.mockResolvedValue(null)
    client.searchUserGroups.mockResolvedValue(makeEmptyGroupsResponse())
    client.createUserGroups.mockResolvedValue(undefined as any)
    client.createPermissionTemplate.mockResolvedValue(undefined as any)
    client.setPermissionDefaultTemplate.mockResolvedValue(undefined as any)
    client.addPermissionProjectCreatorToTemplate.mockResolvedValue(undefined as any)
    client.addPermissionGroupToTemplate.mockResolvedValue(undefined as any)
    client.addPermissionGroup.mockResolvedValue(undefined as any)
    client.addPermissionUser.mockResolvedValue(undefined as any)
    client.searchUsers.mockResolvedValue(makeEmptyUsersResponse())
    client.createUser.mockResolvedValue(undefined as any)
    client.deactivateUser.mockResolvedValue(undefined as any)
    client.revokeUserToken.mockResolvedValue(undefined as any)
    client.generateUserToken.mockResolvedValue({ token: 'new-token', login: '', name: '' })
    client.searchProject.mockResolvedValue(makeEmptyProjectsResponse())
    client.createProject.mockResolvedValue(undefined as any)
    client.deleteProject.mockResolvedValue(undefined as any)
    vault.readSonarqubeUser.mockResolvedValue(null)
    vault.writeSonarqubeUser.mockResolvedValue(undefined)
    vault.deleteSonarqubeUser.mockResolvedValue(undefined)
  })

  describe('init', () => {
    it('should set up the permission template', async () => {
      await service.init()
      expect(client.createPermissionTemplate).toHaveBeenCalledWith({ name: 'Forge Default' })
      expect(client.setPermissionDefaultTemplate).toHaveBeenCalledWith({ templateName: 'Forge Default' })
    })

    it('should create /console/admin group with global permissions when it does not exist', async () => {
      await service.init()
      expect(client.createUserGroups).toHaveBeenCalledWith(expect.objectContaining({ name: '/console/admin' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/console/admin' }))
    })

    it('should create /console/readonly and /console/security platform groups', async () => {
      await service.init()
      expect(client.createUserGroups).toHaveBeenCalledWith(expect.objectContaining({ name: '/console/readonly' }))
      expect(client.createUserGroups).toHaveBeenCalledWith(expect.objectContaining({ name: '/console/security' }))
    })

    it('should not create groups that already exist', async () => {
      client.searchUserGroups.mockResolvedValue({
        paging: makeSonarqubePaging({ total: 1 }),
        groups: [{ id: '1', name: '/console/admin', description: '', membersCount: 1, default: false }],
      })
      await service.init()
      expect(client.createUserGroups).not.toHaveBeenCalledWith(expect.objectContaining({ name: '/console/admin' }))
    })

    it('should skip initialization when URL is not configured', async () => {
      const module = await Test.createTestingModule({
        providers: [
          SonarqubeService,
          { provide: SonarqubeClientService, useValue: client },
          { provide: SonarqubeDatastoreService, useValue: datastore },
          { provide: VaultClientService, useValue: vault },
          { provide: ConfigurationService, useValue: { getInternalOrPublicSonarqubeUrl: () => undefined } },
        ],
      }).compile()
      await module.get(SonarqubeService).init()
      expect(client.createPermissionTemplate).not.toHaveBeenCalled()
    })

    it('should use custom group paths from admin plugin config', async () => {
      datastore.getAdminPluginConfig.mockImplementation((_plugin, key) => {
        if (key === 'adminGroupPath') return Promise.resolve('/custom/admin')
        return Promise.resolve(null)
      })
      await service.init()
      expect(client.createUserGroups).toHaveBeenCalledWith(expect.objectContaining({ name: '/custom/admin' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/custom/admin' }))
    })
  })

  describe('handleUpsert', () => {
    it('should create the 5 project role groups in SonarQube', async () => {
      const project = makeProjectWithDetails({ slug: 'my-project', repositories: [] })

      await service.handleUpsert(project)

      expect(client.createUserGroups).toHaveBeenCalledWith(expect.objectContaining({ name: '/my-project/console/admin' }))
      expect(client.createUserGroups).toHaveBeenCalledWith(expect.objectContaining({ name: '/my-project/console/devops' }))
      expect(client.createUserGroups).toHaveBeenCalledWith(expect.objectContaining({ name: '/my-project/console/developer' }))
      expect(client.createUserGroups).toHaveBeenCalledWith(expect.objectContaining({ name: '/my-project/console/security' }))
      expect(client.createUserGroups).toHaveBeenCalledWith(expect.objectContaining({ name: '/my-project/console/readonly' }))
    })

    it('should create a new user and write vault credentials', async () => {
      const project = makeProjectWithDetails({ slug: 'my-project', repositories: [] })

      await service.handleUpsert(project)

      expect(client.createUser).toHaveBeenCalledWith(expect.objectContaining({ login: 'my-project' }))
      expect(client.generateUserToken).toHaveBeenCalledWith(expect.objectContaining({ login: 'my-project' }))
      expect(vault.writeSonarqubeUser).toHaveBeenCalledWith('my-project', expect.objectContaining({ SONAR_USERNAME: 'my-project', SONAR_TOKEN: 'new-token' }))
    })

    it('should set role-based permissions on new repositories', async () => {
      const project = makeProjectWithDetails({ slug: 'proj', repositories: [{ internalRepoName: 'repo' }] })

      await service.handleUpsert(project)

      expect(client.createProject).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'private', name: 'proj-repo' }))
      expect(client.addPermissionUser).toHaveBeenCalledWith(expect.objectContaining({ login: 'proj' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/proj/console/admin' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/proj/console/devops' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/proj/console/developer' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/console/readonly' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/console/security' }))
    })

    it('should not recreate user or write vault when both user and secret exist', async () => {
      const project = makeProjectWithDetails({ slug: 'existing', repositories: [] })
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: 'existing' })] })
      vault.readSonarqubeUser.mockResolvedValue({ data: { SONAR_USERNAME: 'existing', SONAR_PASSWORD: 'pw', SONAR_TOKEN: 'tok' }, metadata: {} as any })

      await service.handleUpsert(project)

      expect(client.createUser).not.toHaveBeenCalled()
      expect(client.generateUserToken).not.toHaveBeenCalled()
      expect(vault.writeSonarqubeUser).not.toHaveBeenCalled()
    })

    it('should rotate token when user exists but vault secret is missing', async () => {
      const project = makeProjectWithDetails({ slug: 'proj', repositories: [] })
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: 'proj' })] })

      await service.handleUpsert(project)

      expect(client.createUser).not.toHaveBeenCalled()
      expect(client.generateUserToken).toHaveBeenCalledWith(expect.objectContaining({ login: 'proj' }))
      expect(vault.writeSonarqubeUser).toHaveBeenCalledWith('proj', expect.objectContaining({ SONAR_PASSWORD: 'not initialized' }))
    })

    it('should delete sonarqube projects for removed repositories', async () => {
      const project = makeProjectWithDetails({ slug: 'proj', repositories: [{ internalRepoName: 'kept' }] })
      client.searchProject.mockResolvedValue({
        paging: makeSonarqubePaging({ total: 2 }),
        components: [
          { key: 'proj-kept-aabb', name: '', qualifier: 'TRK', visibility: 'private' },
          { key: 'proj-removed-ccdd', name: '', qualifier: 'TRK', visibility: 'private' },
        ],
      })
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: 'proj' })] })
      vault.readSonarqubeUser.mockResolvedValue({ data: { SONAR_USERNAME: 'proj', SONAR_PASSWORD: 'pw', SONAR_TOKEN: 'tok' }, metadata: {} as any })

      await service.handleUpsert(project)

      expect(client.deleteProject).toHaveBeenCalledWith({ project: 'proj-removed-ccdd' })
      expect(client.deleteProject).not.toHaveBeenCalledWith({ project: 'proj-kept-aabb' })
    })

    it('should use comma-separated group path suffixes from project plugin config', async () => {
      const project = makeProjectWithDetails({
        slug: 'proj',
        repositories: [{ internalRepoName: 'repo' }],
        plugins: [{ key: 'projectAdminSuffix', value: '/console/admin,/console/owner' }],
      })

      await service.handleUpsert(project)

      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/proj/console/admin' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/proj/console/owner' }))
    })
  })

  describe('handleDelete', () => {
    it('should delete sonarqube projects, anonymize user and remove vault entry', async () => {
      const project = makeProjectWithDetails({ slug: 'doomed' })
      client.searchProject.mockResolvedValue({
        paging: makeSonarqubePaging({ total: 1 }),
        components: [{ key: 'doomed-repo-aabb', name: '', qualifier: 'TRK', visibility: 'private' }],
      })
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: 'doomed' })] })

      await service.handleDelete(project)

      expect(client.deleteProject).toHaveBeenCalledWith({ project: 'doomed-repo-aabb' })
      expect(client.deactivateUser).toHaveBeenCalledWith({ login: 'doomed', anonymize: true })
      expect(vault.deleteSonarqubeUser).toHaveBeenCalledWith('doomed')
    })

    it('should skip anonymization when the user does not exist', async () => {
      const project = makeProjectWithDetails({ slug: 'no-user' })

      await service.handleDelete(project)

      expect(client.deactivateUser).not.toHaveBeenCalled()
      expect(vault.deleteSonarqubeUser).toHaveBeenCalledWith('no-user')
    })
  })

  describe('handleCron', () => {
    it('should reconcile all projects and run init', async () => {
      datastore.getAllProjects.mockResolvedValue([
        makeProjectWithDetails({ slug: 'proj-a', repositories: [] }),
        makeProjectWithDetails({ slug: 'proj-b', repositories: [] }),
      ])

      await service.handleCron()

      expect(client.searchProject).toHaveBeenCalledTimes(2)
      expect(client.createPermissionTemplate).toHaveBeenCalledOnce()
    })
  })
})
