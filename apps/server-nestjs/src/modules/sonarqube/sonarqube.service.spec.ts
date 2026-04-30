import type { Mocked } from 'vitest'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { makeVaultSecret } from '../vault/vault-testing.utils.js'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeDatastoreService } from './sonarqube-datastore.service'
import {
  makeEmptyGroupsResponse,
  makeEmptyProjectsResponse,
  makeEmptyUsersResponse,
  makeProjectWithDetails,
  makeSonarqubePaging,
  makeSonarqubeUser,
  makeUserToken,
} from './sonarqube-testing.utils'
import { SonarqubeService } from './sonarqube.service'

function createTestingModule() {
  return Test.createTestingModule({
    providers: [
      SonarqubeService,
      {
        provide: SonarqubeClientService,
        useValue: {
          searchUserGroup: vi.fn(),
          createUserGroup: vi.fn(),
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
    client = module.get(SonarqubeClientService)
    datastore = module.get(SonarqubeDatastoreService)
    vault = module.get(VaultClientService)

    datastore.getAdminPluginConfig.mockResolvedValue(null)
    client.searchUserGroup.mockResolvedValue(makeEmptyGroupsResponse())
    client.createUserGroup.mockResolvedValue(undefined)
    client.createPermissionTemplate.mockResolvedValue(undefined)
    client.setPermissionDefaultTemplate.mockResolvedValue(undefined)
    client.addPermissionProjectCreatorToTemplate.mockResolvedValue(undefined)
    client.addPermissionGroupToTemplate.mockResolvedValue(undefined)
    client.addPermissionGroup.mockResolvedValue(undefined)
    client.addPermissionUser.mockResolvedValue(undefined)
    client.searchUsers.mockResolvedValue(makeEmptyUsersResponse())
    client.createUser.mockResolvedValue(undefined)
    client.deactivateUser.mockResolvedValue(undefined)
    client.revokeUserToken.mockResolvedValue(undefined)
    client.searchProject.mockResolvedValue(makeEmptyProjectsResponse())
    client.createProject.mockResolvedValue(undefined)
    client.deleteProject.mockResolvedValue(undefined)
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
      expect(client.createUserGroup).toHaveBeenCalledWith(expect.objectContaining({ name: '/console/admin' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/console/admin' }))
    })

    it('should create /console/readonly and /console/security platform groups', async () => {
      await service.init()
      expect(client.createUserGroup).toHaveBeenCalledWith(expect.objectContaining({ name: '/console/readonly' }))
      expect(client.createUserGroup).toHaveBeenCalledWith(expect.objectContaining({ name: '/console/security' }))
    })

    it('should not create groups that already exist', async () => {
      client.searchUserGroup.mockResolvedValue({
        paging: makeSonarqubePaging({ total: 1 }),
        groups: [{ id: '1', name: '/console/admin', description: '', membersCount: 1, default: false }],
      })
      await service.init()
      expect(client.createUserGroup).not.toHaveBeenCalledWith(expect.objectContaining({ name: '/console/admin' }))
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
      expect(client.createUserGroup).toHaveBeenCalledWith(expect.objectContaining({ name: '/custom/admin' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/custom/admin' }))
    })
  })

  describe('handleUpsert', () => {
    it('should create the 5 project role groups in SonarQube', async () => {
      const project = makeProjectWithDetails()
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))

      await service.handleUpsert(project)

      expect(client.createUserGroup).toHaveBeenCalledWith(expect.objectContaining({ name: `/${project.slug}/console/admin` }))
      expect(client.createUserGroup).toHaveBeenCalledWith(expect.objectContaining({ name: `/${project.slug}/console/devops` }))
      expect(client.createUserGroup).toHaveBeenCalledWith(expect.objectContaining({ name: `/${project.slug}/console/developer` }))
      expect(client.createUserGroup).toHaveBeenCalledWith(expect.objectContaining({ name: `/${project.slug}/console/security` }))
      expect(client.createUserGroup).toHaveBeenCalledWith(expect.objectContaining({ name: `/${project.slug}/console/readonly` }))
    })

    it('should create a new user and write vault credentials', async () => {
      const project = makeProjectWithDetails()
      const userToken = makeUserToken({ login: project.slug })
      client.generateUserToken.mockResolvedValue(userToken)

      await service.handleUpsert(project)

      expect(client.createUser).toHaveBeenCalledWith(expect.objectContaining({ login: project.slug }))
      expect(client.generateUserToken).toHaveBeenCalledWith(expect.objectContaining({ login: project.slug }))
      expect(vault.writeSonarqubeUser).toHaveBeenCalledWith(project.slug, expect.objectContaining({ SONAR_USERNAME: project.slug, SONAR_TOKEN: userToken.token }))
    })

    it('should set role-based permissions on new repositories', async () => {
      const project = makeProjectWithDetails({ repositories: [{ internalRepoName: 'repo' }] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))

      await service.handleUpsert(project)

      expect(client.createProject).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'private', name: `${project.slug}-repo` }))
      expect(client.addPermissionUser).toHaveBeenCalledWith(expect.objectContaining({ login: project.slug }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: `/${project.slug}/console/admin` }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: `/${project.slug}/console/devops` }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: `/${project.slug}/console/developer` }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/console/readonly' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: '/console/security' }))
    })

    it('should not recreate user or write vault when both user and secret exist', async () => {
      const project = makeProjectWithDetails({ slug: 'existing', repositories: [] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: project.slug })] })
      vault.readSonarqubeUser.mockResolvedValue(makeVaultSecret({ data: { SONAR_USERNAME: project.slug, SONAR_PASSWORD: 'pw', SONAR_TOKEN: 'tok' } }))

      await service.handleUpsert(project)

      expect(client.createUser).not.toHaveBeenCalled()
      expect(client.generateUserToken).not.toHaveBeenCalled()
      expect(vault.writeSonarqubeUser).not.toHaveBeenCalled()
    })

    it('should rotate token when user exists but vault secret is missing', async () => {
      const project = makeProjectWithDetails({ repositories: [] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: project.slug })] })

      await service.handleUpsert(project)

      expect(client.createUser).not.toHaveBeenCalled()
      expect(client.generateUserToken).toHaveBeenCalledWith(expect.objectContaining({ login: project.slug }))
      expect(vault.writeSonarqubeUser).toHaveBeenCalledWith(project.slug, expect.objectContaining({ SONAR_PASSWORD: 'not initialized' }))
    })

    it('should delete sonarqube projects for removed repositories', async () => {
      const project = makeProjectWithDetails({ repositories: [{ internalRepoName: 'kept' }] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchProject.mockResolvedValue({
        paging: makeSonarqubePaging({ total: 2 }),
        components: [
          { key: `${project.slug}-kept-aabb`, name: '', qualifier: 'TRK', visibility: 'private' },
          { key: `${project.slug}-removed-ccdd`, name: '', qualifier: 'TRK', visibility: 'private' },
        ],
      })
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: project.slug })] })
      vault.readSonarqubeUser.mockResolvedValue(makeVaultSecret({ data: { SONAR_USERNAME: project.slug, SONAR_PASSWORD: 'pw', SONAR_TOKEN: 'tok' } }))

      await service.handleUpsert(project)

      expect(client.deleteProject).toHaveBeenCalledWith({ project: `${project.slug}-removed-ccdd` })
      expect(client.deleteProject).not.toHaveBeenCalledWith({ project: `${project.slug}-kept-aabb` })
    })

    it('should use comma-separated group path suffixes from project plugin config', async () => {
      const project = makeProjectWithDetails({
        repositories: [{ internalRepoName: 'repo' }],
        plugins: [{ key: 'projectAdminSuffix', value: '/console/admin,/console/owner' }],
      })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))

      await service.handleUpsert(project)

      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: `/${project.slug}/console/admin` }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: `/${project.slug}/console/owner` }))
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
      const projects = [
        makeProjectWithDetails({ repositories: [] }),
        makeProjectWithDetails({ repositories: [] }),
      ]
      datastore.getAllProjects.mockResolvedValue(projects)
      client.generateUserToken.mockImplementation(({ login }) => Promise.resolve(makeUserToken({ login })))

      await service.handleCron()

      expect(client.searchProject).toHaveBeenCalledTimes(2)
      expect(client.createPermissionTemplate).toHaveBeenCalledOnce()
    })
  })
})
