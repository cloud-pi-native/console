import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { generateProjectKey } from '../../utils/crypto'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { makeVaultSecret } from '../vault/vault-testing.utils'
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
import { PLUGIN_NAME, SONARQUBE_PROJECT_QUALIFIER_PROJECT } from './sonarqube.constants'
import { SonarqubeService } from './sonarqube.service'

describe('sonarqubeService', () => {
  let service: SonarqubeService
  let client: DeepMockProxy<SonarqubeClientService>
  let datastore: DeepMockProxy<SonarqubeDatastoreService>
  let vault: DeepMockProxy<VaultClientService>
  let config: DeepMockProxy<ConfigurationService>

  beforeEach(async () => {
    client = mockDeep<SonarqubeClientService>({
      searchUserGroup: vi.fn().mockResolvedValue(makeEmptyGroupsResponse()),
      createUserGroup: vi.fn().mockResolvedValue(undefined),
      createPermissionTemplate: vi.fn().mockResolvedValue(undefined),
      searchPermissionTemplates: vi.fn().mockResolvedValue({ permissionTemplates: [] }),
      setPermissionDefaultTemplate: vi.fn().mockResolvedValue(undefined),
      addPermissionProjectCreatorToTemplate: vi.fn().mockResolvedValue(undefined),
      addPermissionGroupToTemplate: vi.fn().mockResolvedValue(undefined),
      addPermissionGroup: vi.fn().mockResolvedValue(undefined),
      addPermissionUser: vi.fn().mockResolvedValue(undefined),
      searchUsers: vi.fn().mockResolvedValue(makeEmptyUsersResponse()),
      createUser: vi.fn().mockResolvedValue(undefined),
      deactivateUser: vi.fn().mockResolvedValue(undefined),
      revokeUserToken: vi.fn().mockResolvedValue(undefined),
      searchProject: vi.fn().mockResolvedValue(makeEmptyProjectsResponse()),
      createProject: vi.fn().mockResolvedValue(undefined),
      deleteProject: vi.fn().mockResolvedValue(undefined),
    })
    datastore = mockDeep<SonarqubeDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
    })
    vault = mockDeep<VaultClientService>({
      readSonarqubeUser: vi.fn().mockResolvedValue(null),
      writeSonarqubeUser: vi.fn().mockResolvedValue(undefined),
      deleteSonarqubeUser: vi.fn().mockResolvedValue(undefined),
    })
    config = mockDeep<ConfigurationService>({
      projectRootDir: 'forge',
      getInternalOrPublicSonarqubeUrl: vi.fn().mockReturnValue('https://sonarqube.internal'),
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        SonarqubeService,
        { provide: SonarqubeClientService, useValue: client },
        { provide: SonarqubeDatastoreService, useValue: datastore },
        { provide: VaultClientService, useValue: vault },
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(SonarqubeService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('init', () => {
    it('should set up the permission template', async () => {
      await service.init()
      expect(client.createPermissionTemplate).toHaveBeenCalledWith({ name: 'Forge Default' })
      expect(client.setPermissionDefaultTemplate).toHaveBeenCalledWith({ templateName: 'Forge Default' })
    })

    it('should not recreate the permission template when it already exists', async () => {
      client.searchPermissionTemplates.mockResolvedValue({
        permissionTemplates: [{ id: '1', name: 'Forge Default' }],
      })
      await service.init()
      expect(client.createPermissionTemplate).not.toHaveBeenCalled()
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
      config.getInternalOrPublicSonarqubeUrl.mockReturnValue(undefined)

      await service.init()

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
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: `/${project.slug}/console/developer`, permission: 'issueadmin' }))
      expect(client.addPermissionGroup).toHaveBeenCalledWith(expect.objectContaining({ groupName: `/${project.slug}/console/developer`, permission: 'securityhotspotadmin' }))
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
      const keptKey = generateProjectKey(project.slug, 'kept')
      const removedKey = generateProjectKey(project.slug, 'removed')
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchProject.mockResolvedValue({
        paging: makeSonarqubePaging({ total: 2 }),
        components: [
          { key: keptKey, name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' },
          { key: removedKey, name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' },
        ],
      })
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: project.slug })] })
      vault.readSonarqubeUser.mockResolvedValue(makeVaultSecret({ data: { SONAR_USERNAME: project.slug, SONAR_PASSWORD: 'pw', SONAR_TOKEN: 'tok' } }))

      await service.handleUpsert(project)

      expect(client.deleteProject).toHaveBeenCalledWith({ project: removedKey })
      expect(client.deleteProject).not.toHaveBeenCalledWith({ project: keptKey })
    })

    it('should not delete sonarqube projects whose key was not generated by the console', async () => {
      const project = makeProjectWithDetails({ slug: 'my', repositories: [] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchProject.mockResolvedValue({
        paging: makeSonarqubePaging({ total: 2 }),
        components: [
          // manually created project, hash suffix does not match generateProjectKey
          { key: 'my-manual-project', name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' },
          // belongs to project "my-app" (repo "x"), not to project "my"
          { key: generateProjectKey('my-app', 'x'), name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' },
        ],
      })
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: project.slug })] })
      vault.readSonarqubeUser.mockResolvedValue(makeVaultSecret({ data: { SONAR_USERNAME: project.slug, SONAR_PASSWORD: 'pw', SONAR_TOKEN: 'tok' } }))

      await service.handleUpsert(project)

      expect(client.deleteProject).not.toHaveBeenCalled()
    })

    it('should use comma-separated group path suffixes from project plugin config', async () => {
      const project = makeProjectWithDetails({
        repositories: [{ internalRepoName: 'repo' }],
        plugins: [{ pluginName: PLUGIN_NAME, key: 'projectAdminSuffix', value: '/console/admin,/console/owner' }],
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
      const doomedKey = generateProjectKey('doomed', 'repo')
      client.searchProject.mockResolvedValue({
        paging: makeSonarqubePaging({ total: 1 }),
        components: [{ key: doomedKey, name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' }],
      })
      client.searchUsers.mockResolvedValue({ paging: makeSonarqubePaging({ total: 1 }), users: [makeSonarqubeUser({ login: 'doomed' })] })

      await service.handleDelete(project)

      expect(client.deleteProject).toHaveBeenCalledWith({ project: doomedKey })
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
