import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'
import { generateProjectKey } from '../../utils/crypto.utils'
import { VaultClientService } from '../vault/vault-client.service'
import { makeVaultSecret } from '../vault/vault-testing.utils'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeError } from './sonarqube-http-client.service'
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
import { GitlabClientService } from '../gitlab/gitlab-client.service'

describe('sonarqubeService', () => {
  let service: SonarqubeService
  let client: DeepMockProxy<SonarqubeClientService>
  let datastore: DeepMockProxy<SonarqubeDatastoreService>
  let vault: DeepMockProxy<VaultClientService>
  let config: DeepMockProxy<ConfigType<typeof sonarqubeConfigFactory>>
  let gitlab: DeepMockProxy<GitlabClientService>

  beforeEach(async () => {
    client = mockDeep<SonarqubeClientService>({
      searchUserGroup: vi.fn().mockResolvedValue(makeEmptyGroupsResponse()),
      createUserGroup: vi.fn().mockResolvedValue(undefined),
      createPermissionTemplate: vi.fn().mockResolvedValue(undefined),
      searchPermissionTemplates: vi.fn().mockResolvedValue({ permissionTemplates: [] }),
      setPermissionDefaultTemplate: vi.fn().mockResolvedValue(undefined),
      addPermissionGroupToTemplate: vi.fn().mockResolvedValue(undefined),
      addPermissionGroup: vi.fn().mockResolvedValue(undefined),
      addPermissionUser: vi.fn().mockResolvedValue(undefined),
      searchUsers: vi.fn().mockImplementation(async function* () { yield* makeEmptyUsersResponse().users }),
      createUser: vi.fn().mockResolvedValue(undefined),
      updateUser: vi.fn().mockResolvedValue(undefined),
      deactivateUser: vi.fn().mockResolvedValue(undefined),
      revokeUserToken: vi.fn().mockResolvedValue(undefined),
      searchProject: vi.fn().mockImplementation(async function* () { yield* makeEmptyProjectsResponse().components }),
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
    config = mockDeep<ConfigType<typeof sonarqubeConfigFactory>>({
    })
    gitlab = mockDeep<GitlabClientService>({
      setGitlabGroupVariable: vi.fn().mockResolvedValue(undefined),
      setGitlabRepoVariable: vi.fn().mockResolvedValue(undefined),
      getOrCreateProjectGroup: vi.fn().mockResolvedValue({ id: 42, full_path: 'root', name: 'root' }),
      getOrCreateProjectGroupRepo: vi.fn().mockResolvedValue({ id: 99 }),
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        SonarqubeService,
        { provide: SonarqubeClientService, useValue: client },
        { provide: SonarqubeDatastoreService, useValue: datastore },
        { provide: VaultClientService, useValue: vault },
        { provide: GitlabClientService, useValue: gitlab },
        { provide: sonarqubeConfigFactory.KEY, useValue: config },
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

    it('should provision GitLab CI variables for each repository and the shared group token', async () => {
      const project = makeProjectWithDetails({ repositories: [{ internalRepoName: 'repo' }] })
      const groupId = 42
      const repoId = 99
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      vault.readSonarqubeUser.mockResolvedValue(makeVaultSecret({ data: { SONAR_USERNAME: project.slug, SONAR_PASSWORD: 'pw', SONAR_TOKEN: 'tok' } }))

      await service.handleUpsert(project)

      const key = generateProjectKey(project.slug, 'repo')
      expect(gitlab.setGitlabRepoVariable).toHaveBeenCalledWith(repoId, 'PROJECT_KEY', key, expect.objectContaining({ masked: false, variableType: 'env_var', environmentScope: '*' }))
      expect(gitlab.setGitlabRepoVariable).toHaveBeenCalledWith(repoId, 'PROJECT_NAME', `${project.slug}-repo`, expect.objectContaining({ masked: false, variableType: 'env_var', environmentScope: '*' }))
      expect(gitlab.setGitlabRepoVariable).toHaveBeenCalledWith(repoId, 'SONAR_PROJECT_PROPERTIES', expect.stringContaining(`sonar.projectKey=${key}`), expect.objectContaining({ masked: false, variableType: 'file', environmentScope: '*' }))
      expect(gitlab.setGitlabGroupVariable).toHaveBeenCalledWith(groupId, 'SONAR_TOKEN', 'tok', expect.objectContaining({ masked: true, variableType: 'env_var' }))
    })

    it('should not recreate user or write vault when both user and secret exist', async () => {
      const project = makeProjectWithDetails({ slug: 'existing', repositories: [] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchUsers.mockImplementation(async function* () { yield makeSonarqubeUser({ login: project.slug }) })
      vault.readSonarqubeUser.mockResolvedValue(makeVaultSecret({ data: { SONAR_USERNAME: project.slug, SONAR_PASSWORD: 'pw', SONAR_TOKEN: 'tok' } }))

      await service.handleUpsert(project)

      expect(client.createUser).not.toHaveBeenCalled()
      expect(client.generateUserToken).not.toHaveBeenCalled()
      expect(vault.writeSonarqubeUser).not.toHaveBeenCalled()
    })

    it('should regenerate password and rotate token when user exists but vault secret is missing', async () => {
      const project = makeProjectWithDetails({ repositories: [] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchUsers.mockImplementation(async function* () { yield makeSonarqubeUser({ login: project.slug }) })

      await service.handleUpsert(project)

      expect(client.createUser).not.toHaveBeenCalled()
      expect(client.updateUser).toHaveBeenCalledWith(expect.objectContaining({ login: project.slug, password: expect.any(String) }))
      expect(client.generateUserToken).toHaveBeenCalledWith(expect.objectContaining({ login: project.slug }))
      expect(vault.writeSonarqubeUser).toHaveBeenCalledWith(project.slug, expect.objectContaining({ SONAR_USERNAME: project.slug, SONAR_PASSWORD: expect.any(String), SONAR_TOKEN: expect.any(String) }))
    })

    it('should reconcile the email of an existing robot account stamped with the owner real email (#2510 mitigation)', async () => {
      const project = makeProjectWithDetails({ slug: 'with-owner', owner: { email: 'owner@example.com' } as any })
      vault.readSonarqubeUser.mockResolvedValue(makeVaultSecret({ data: { SONAR_USERNAME: 'with-owner', SONAR_PASSWORD: 'old', SONAR_TOKEN: 'old' } }))
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchUsers.mockImplementation(async function* () {
        yield makeSonarqubeUser({ login: 'with-owner', email: 'owner@example.com' })
      })

      await service.handleUpsert(project)

      expect(client.createUser).not.toHaveBeenCalled()
      expect(client.updateUser).toHaveBeenCalledWith(expect.objectContaining({
        login: 'with-owner',
        email: 'with-owner@cloud-pi-native.fr',
      }))
      expect(client.updateUser).not.toHaveBeenCalledWith(expect.objectContaining({ password: expect.any(String) }))
    })

    it('should not call updateUser when an existing robot account already has the cloud-pi-native.fr email', async () => {
      const project = makeProjectWithDetails({ slug: 'clean' })
      vault.readSonarqubeUser.mockResolvedValue(makeVaultSecret({ data: { SONAR_USERNAME: 'clean', SONAR_PASSWORD: 'old', SONAR_TOKEN: 'old' } }))
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchUsers.mockImplementation(async function* () {
        yield makeSonarqubeUser({ login: 'clean', email: 'clean@cloud-pi-native.fr' })
      })

      await service.handleUpsert(project)

      expect(client.updateUser).not.toHaveBeenCalled()
    })

    it('should update both email and password when an existing robot account has a stale email and the vault secret is missing', async () => {
      const project = makeProjectWithDetails({ slug: 'stale', owner: { email: 'owner@example.com' } as any })
      vault.readSonarqubeUser.mockResolvedValue(null)
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchUsers.mockImplementation(async function* () {
        yield makeSonarqubeUser({ login: 'stale', email: 'owner@example.com' })
      })

      await service.handleUpsert(project)

      expect(client.createUser).not.toHaveBeenCalled()
      expect(client.updateUser).toHaveBeenCalledWith(expect.objectContaining({
        login: 'stale',
        email: 'stale@cloud-pi-native.fr',
        password: expect.any(String),
      }))
      expect(vault.writeSonarqubeUser).toHaveBeenCalledWith('stale', expect.objectContaining({ SONAR_USERNAME: 'stale', SONAR_PASSWORD: expect.any(String), SONAR_TOKEN: expect.any(String) }))
    })

    it('should delete sonarqube projects for removed repositories', async () => {
      const project = makeProjectWithDetails({ repositories: [{ internalRepoName: 'kept' }] })
      const keptKey = generateProjectKey(project.slug, 'kept')
      const removedKey = generateProjectKey(project.slug, 'removed')
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchProject.mockImplementation(async function* () {
        yield { key: keptKey, name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' }
        yield { key: removedKey, name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' }
      })
      client.searchUsers.mockImplementation(async function* () { yield makeSonarqubeUser({ login: project.slug }) })
      vault.readSonarqubeUser.mockResolvedValue(makeVaultSecret({ data: { SONAR_USERNAME: project.slug, SONAR_PASSWORD: 'pw', SONAR_TOKEN: 'tok' } }))

      await service.handleUpsert(project)

      expect(client.deleteProject).toHaveBeenCalledWith({ project: removedKey })
      expect(client.deleteProject).not.toHaveBeenCalledWith({ project: keptKey })
    })

    it('should not delete sonarqube projects whose key was not generated by the console', async () => {
      const project = makeProjectWithDetails({ slug: 'my', repositories: [] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchProject.mockImplementation(async function* () {
        // manually created project, hash suffix does not match generateProjectKey
        yield { key: 'my-manual-project', name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' }
        // belongs to project "my-app" (repo "x"), not to project "my"
        yield { key: generateProjectKey('my-app', 'x'), name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' }
      })
      client.searchUsers.mockImplementation(async function* () { yield makeSonarqubeUser({ login: project.slug }) })
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
      client.searchProject.mockImplementation(async function* () {
        yield { key: doomedKey, name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' }
      })
      client.searchUsers.mockImplementation(async function* () { yield makeSonarqubeUser({ login: 'doomed' }) })

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

    it('should use a per-project cloud-pi-native.fr email (never the owner real email) when creating user', async () => {
      const project = makeProjectWithDetails({ slug: 'with-owner', owner: { email: 'owner@example.com' } as any })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.searchUsers.mockImplementation(async function* () {})

      await service.handleUpsert(project)

      // Regression guard for #2510: using the owner's real email on a `local: true` robot account
      // makes the owner's SSO login collide ("already associated with another authentication
      // method"). The email must be derived from the slug, never from the owner identity.
      expect(client.createUser).toHaveBeenCalledWith(expect.objectContaining({
        login: project.slug,
        email: `${project.slug}@cloud-pi-native.fr`,
      }))
      expect(client.createUser).not.toHaveBeenCalledWith(expect.objectContaining({ email: project.owner.email }))
    })
  })

  describe('external-call error paths (409 / transient 5xx / cleanup)', () => {
    // Legacy contracts: plugins/sonarqube/src/project.ts:75 createProject has no 409 handling
    // and the legacy upsert hook (functions.ts:115) returns WARNING/KO on error; delete relies on
    // find-then-delete. Current SonarqubeService mirrors this and forwards 4xx/5xx once.

    it('handleUpsert does not recreate an existing SonarQube project (idempotent, avoids 409)', async () => {
      const project = makeProjectWithDetails({ repositories: [{ internalRepoName: 'repo' }] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      const key = generateProjectKey(project.slug, 'repo')
      client.searchProject.mockImplementation(async function* () {
        yield { key, name: `${project.slug}-repo`, qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' }
      })

      await service.handleUpsert(project)

      expect(client.createProject).not.toHaveBeenCalled()
    })

    it('handleUpsert propagates a 409 conflict from project creation as a KO result', async () => {
      const project = makeProjectWithDetails({ repositories: [{ internalRepoName: 'repo' }] })
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.createProject.mockRejectedValue(
        new SonarqubeError('ClientError', 'SonarQube API responded with status 409', {
          status: 409,
          method: 'POST',
          path: 'projects/create',
        }),
      )

      const result = await service.handleUpsert(project)
      // Legacy contract: plugins/sonarqube/src/project.ts:75 createProject has no 409 handling;
      // the legacy upsert hook returns KO on such an error. Current behaviour matches.
      expect(result.sonarqube.status).toBe('KO')
    })

    it('handleUpsert propagates a transient 5xx (503) from a client call as KO without retrying', async () => {
      const project = makeProjectWithDetails()
      client.generateUserToken.mockResolvedValue(makeUserToken({ login: project.slug }))
      client.createUser.mockRejectedValue(
        new SonarqubeError('ServerError', 'SonarQube API responded with status 503', {
          status: 503,
          method: 'POST',
          path: 'users/create',
        }),
      )

      const result = await service.handleUpsert(project)
      // No retry logic exists in SonarqubeHttpClientService.fetch; 5xx forwarded once.
      expect(result.sonarqube.status).toBe('KO')
    })

    it('handleDelete returns KO when deleting an existing SonarQube project fails with a 5xx', async () => {
      const project = makeProjectWithDetails({ slug: 'doomed' })
      const doomedKey = generateProjectKey('doomed', 'repo')
      client.searchProject.mockImplementation(async function* () {
        yield { key: doomedKey, name: '', qualifier: SONARQUBE_PROJECT_QUALIFIER_PROJECT, visibility: 'private' }
      })
      client.searchUsers.mockImplementation(async function* () {})
      client.deleteProject.mockRejectedValue(
        new SonarqubeError('ServerError', 'SonarQube API responded with status 503', {
          status: 503,
          method: 'POST',
          path: 'projects/delete',
        }),
      )

      const result = await service.handleDelete(project)
      expect(result.sonarqube.status).toBe('KO')
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
