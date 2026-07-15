import type { DeepMockProxy } from 'vitest-mock-extended'
import { ENABLED } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { AccessLevel } from '@gitbeaker/core'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { GitlabClientService } from './gitlab-client.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { makeAccessTokenExposedSchema, makeExpandedUserSchema, makeGroupSchema, makeMemberSchema, makePipelineTriggerToken, makeProjectSchema, makeProjectWithDetails } from './gitlab-testing.utils'
import { PLUGIN_NAME, TOPIC_PLUGIN_MANAGED } from './gitlab.constants'
import { GitlabService } from './gitlab.service'

describe('gitlabService', () => {
  let service: GitlabService
  let gitlab: DeepMockProxy<GitlabClientService>
  let vault: DeepMockProxy<VaultClientService>
  let datastore: DeepMockProxy<GitlabDatastoreService>

  beforeEach(async () => {
    gitlab = mockDeep<GitlabClientService>()
    datastore = mockDeep<GitlabDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
      getAdminRolesByOidcGroups: vi.fn().mockResolvedValue([]),
    })
    vault = mockDeep<VaultClientService>({
      writeGitlabMirrorCreds: vi.fn().mockResolvedValue(undefined),
      deleteGitlabMirrorCreds: vi.fn().mockResolvedValue(undefined),
      writeTechReadOnlyCreds: vi.fn().mockResolvedValue(undefined),
      writeMirrorTriggerToken: vi.fn().mockResolvedValue(undefined),
      readTechnReadOnlyCreds: vi.fn().mockResolvedValue(null),
      readGitlabMirrorCreds: vi.fn().mockResolvedValue(null),
    })
    const config = mockDeep<ConfigurationService>({ projectRootDir: 'forge' })

    const moduleRef = await Test.createTestingModule({
      providers: [
        GitlabService,
        { provide: GitlabClientService, useValue: gitlab },
        { provide: GitlabDatastoreService, useValue: datastore },
        { provide: VaultClientService, useValue: vault },
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(GitlabService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('handleUpsert', () => {
    it('should reconcile project members and repositories', async () => {
      const project = makeProjectWithDetails()
      const group = makeGroupSchema({
        id: 123,
        full_path: 'forge/console/project-1',
        full_name: 'forge/console/project-1',
        name: 'project-1',
        path: 'project-1',
        parent_id: 1,
      })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectGroupRepo.mockResolvedValue(makeProjectSchema({ id: 1 }))
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/repo')
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())
      gitlab.upsertUser.mockResolvedValue(makeExpandedUserSchema({ id: 123, username: 'user' }))

      await service.handleUpsert(project)

      expect(gitlab.getOrCreateProjectSubGroup).toHaveBeenCalledWith(project.slug)
      expect(gitlab.getGroupMembers).toHaveBeenCalledWith(group)
      expect(gitlab.getRepos).toHaveBeenCalledWith(project.slug)
    })

    it('should remove orphan member if purge enabled', async () => {
      const project = makeProjectWithDetails({
        plugins: [{ pluginName: PLUGIN_NAME, key: 'purge', value: ENABLED }],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([makeMemberSchema({ id: 999, username: 'orphan' })])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.removeGroupMember).toHaveBeenCalledWith(group, 999)
    })

    it('should not remove managed user (bot) even if purge enabled', async () => {
      const project = makeProjectWithDetails({
        plugins: [{ pluginName: PLUGIN_NAME, key: 'purge', value: ENABLED }],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([makeMemberSchema({ id: 888, username: 'group_123_bot' })])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.removeGroupMember).not.toHaveBeenCalled()
    })

    it('should not remove orphan member if purge disabled', async () => {
      const project = makeProjectWithDetails()
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([makeMemberSchema({ id: 999, username: 'orphan' })])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.removeGroupMember).not.toHaveBeenCalled()
    })

    it('should delete orphan repositories if purge enabled', async () => {
      const project = makeProjectWithDetails({
        plugins: [{ pluginName: PLUGIN_NAME, key: 'purge', value: ENABLED }],
        repositories: [],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })
      const orphanRepo = makeProjectSchema({ name: 'orphan-repo', topics: [TOPIC_PLUGIN_MANAGED] })
      const unmanagedRepo = makeProjectSchema({ name: 'unmanaged-repo', topics: [] })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockImplementation(() => (async function* () {
        yield orphanRepo
        yield unmanagedRepo
      })())
      gitlab.deleteProjectGroupRepo.mockResolvedValue(undefined)
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.deleteProjectGroupRepo).toHaveBeenCalledWith(project.slug, 'orphan-repo')
      expect(gitlab.deleteProjectGroupRepo).toHaveBeenCalledTimes(1)
    })

    it('should not delete orphan repositories if purge disabled', async () => {
      const project = makeProjectWithDetails({
        repositories: [],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })
      const orphanRepo = makeProjectSchema({ name: 'orphan-repo', topics: [TOPIC_PLUGIN_MANAGED] })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockImplementation(() => (async function* () {
        yield orphanRepo
      })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.deleteProjectGroupRepo).not.toHaveBeenCalled()
    })

    it('should not delete orphan repositories without the correct topic even if purge enabled', async () => {
      const project = makeProjectWithDetails({
        plugins: [{ pluginName: PLUGIN_NAME, key: 'purge', value: ENABLED }],
        repositories: [],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })
      const orphanRepoWithoutTopic = makeProjectSchema({ name: 'orphan-repo', topics: [] })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockImplementation(() => (async function* () {
        yield orphanRepoWithoutTopic
      })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.deleteProjectGroupRepo).not.toHaveBeenCalled()
    })

    it('should create gitlab user if not exists', async () => {
      const project = makeProjectWithDetails({
        owner: { id: 'o1', email: 'owner@example.com', firstName: 'Owner', lastName: 'User', adminRoleIds: [] },
        members: [{ user: { id: 'u1', email: 'new@example.com', firstName: 'New', lastName: 'User', adminRoleIds: [] }, roleIds: [] }],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.upsertUser.mockImplementation(async (user) => {
        return makeExpandedUserSchema({
          id: user.email === 'new@example.com' ? 999 : 998,
          email: user.email,
          username: user.email.split('@')[0] ?? user.email,
          name: user.name,
        })
      })
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.upsertUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
        expect.objectContaining({ cpnUserId: 'u1' }),
      )
      expect(gitlab.upsertUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'owner@example.com' }),
        expect.objectContaining({ cpnUserId: 'o1' }),
      )
      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group, 999, AccessLevel.GUEST)
      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group, 998, AccessLevel.OWNER)
    })

    it('should map roles to access levels and apply highest level', async () => {
      const project = makeProjectWithDetails({
        slug: 'project-1',
        roles: [
          { id: 'r-reporter', oidcGroup: '/project-1/console/readonly' },
          { id: 'r-developer', oidcGroup: '/project-1/console/developer' },
          { id: 'r-devops', oidcGroup: '/project-1/console/devops' },
          { id: 'r-maintainer', oidcGroup: '/project-1/console/admin' },
          { id: 'r-unknown', oidcGroup: '/other/group' },
        ],
        members: [
          { user: { id: 'u1', email: 'reporter@example.com', firstName: 'Rep', lastName: 'User', adminRoleIds: [] }, roleIds: ['r-reporter'] },
          { user: { id: 'u2', email: 'developer@example.com', firstName: 'Dev', lastName: 'User', adminRoleIds: [] }, roleIds: ['r-developer'] },
          { user: { id: 'u3', email: 'devops@example.com', firstName: 'Ops', lastName: 'User', adminRoleIds: [] }, roleIds: ['r-devops'] },
          { user: { id: 'u4', email: 'maintainer@example.com', firstName: 'Main', lastName: 'User', adminRoleIds: [] }, roleIds: ['r-maintainer'] },
          { user: { id: 'u5', email: 'mixed@example.com', firstName: 'Mixed', lastName: 'User', adminRoleIds: [] }, roleIds: ['r-reporter', 'r-developer'] },
        ],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.upsertUser.mockImplementation(async (user) => {
        const idByEmail: Record<string, number> = {
          'reporter@example.com': 101,
          'developer@example.com': 102,
          'devops@example.com': 103,
          'maintainer@example.com': 104,
          'mixed@example.com': 105,
          'owner@example.com': 100,
        }
        return makeExpandedUserSchema({
          id: idByEmail[user.email] ?? 999,
          email: user.email,
          username: user.email.split('@')[0] ?? user.email,
          name: user.name,
        })
      })
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group, 101, AccessLevel.REPORTER)
      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group, 102, AccessLevel.DEVELOPER)
      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group, 103, AccessLevel.MAINTAINER)
      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group, 104, AccessLevel.MAINTAINER)
      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group, 105, AccessLevel.DEVELOPER)
    })

    it('should prioritize higher access level when oidc group appears in multiple paths', async () => {
      const project = makeProjectWithDetails({
        slug: 'project-1',
        roles: [
          { id: 'r-devops', oidcGroup: '/project-1/console/devops' },
        ],
        members: [
          { user: { id: 'u1', email: 'devops@example.com', firstName: 'Ops', lastName: 'User', adminRoleIds: [] }, roleIds: ['r-devops'] },
        ],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.upsertUser.mockImplementation(async (user) => {
        return makeExpandedUserSchema({
          id: user.email === 'devops@example.com' ? 101 : 100,
          email: user.email,
          username: user.email.split('@')[0] ?? user.email,
          name: user.name,
        })
      })
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group, 101, AccessLevel.MAINTAINER)
    })

    it('should map security project role to reporter access level', async () => {
      const project = makeProjectWithDetails({
        slug: 'project-1',
        roles: [
          { id: 'r-security', oidcGroup: '/project-1/console/security' },
        ],
        members: [
          { user: { id: 'u1', email: 'security@example.com', firstName: 'Sec', lastName: 'User', adminRoleIds: [] }, roleIds: ['r-security'] },
        ],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.upsertUser.mockImplementation(async (user) => {
        return makeExpandedUserSchema({
          id: user.email === 'security@example.com' ? 105 : 100,
          email: user.email,
          username: user.email.split('@')[0] ?? user.email,
          name: user.name,
        })
      })
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group, 105, AccessLevel.REPORTER)
    })

    it('should downgrade existing member to guest when no role maps to an access level', async () => {
      const project = makeProjectWithDetails({
        roles: [{ id: 'r-unknown', oidcGroup: '/other/group' }],
        members: [{ user: { id: 'u1', email: 'no-access@example.com', firstName: 'No', lastName: 'Access', adminRoleIds: [] }, roleIds: ['r-unknown'] }],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([makeMemberSchema({ id: 105, username: 'no-access', access_level: AccessLevel.REPORTER })])
      gitlab.upsertUser.mockImplementation(async (user) => {
        return makeExpandedUserSchema({
          id: user.email === 'no-access@example.com' ? 105 : 100,
          email: user.email,
          username: user.email.split('@')[0] ?? user.email,
          name: user.name,
        })
      })
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.editGroupMember).toHaveBeenCalledWith(group, 105, AccessLevel.GUEST)
      expect(gitlab.removeGroupMember).not.toHaveBeenCalledWith(group, 105)
    })

    it('should bind builtin roles (admin/auditor) when role ids are resolved', async () => {
      const project = makeProjectWithDetails({
        owner: { id: 'o1', email: 'owner@example.com', firstName: 'Owner', lastName: 'User', adminRoleIds: ['admin-role-id'] },
        members: [
          { user: { id: 'u1', email: 'admin@example.com', firstName: 'Admin', lastName: 'User', adminRoleIds: ['admin-role-id'] }, roleIds: [] },
          { user: { id: 'u2', email: 'auditor@example.com', firstName: 'Auditor', lastName: 'User', adminRoleIds: ['auditor-role-id'] }, roleIds: [] },
        ],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      datastore.getAdminPluginConfig.mockImplementation(async (_pluginName: string, key: string) => {
        if (key === 'adminGroupPath') return '/console/admin'
        if (key === 'auditorGroupPath') return '/console/readonly'
        return null
      })
      datastore.getAdminRolesByOidcGroups.mockResolvedValue([
        { id: 'admin-role-id', oidcGroup: '/console/admin' },
        { id: 'auditor-role-id', oidcGroup: '/console/readonly' },
      ])

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.upsertUser.mockImplementation(async (user) => {
        return makeExpandedUserSchema({
          id: faker.number.int(),
          email: user.email,
          username: user.email.split('@')[0],
          name: user.name,
        })
      })
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.upsertUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'admin@example.com', admin: true, auditor: false }),
        expect.objectContaining({ cpnUserId: 'u1' }),
      )
      expect(gitlab.upsertUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'auditor@example.com', admin: false, auditor: true }),
        expect.objectContaining({ cpnUserId: 'u2' }),
      )
      expect(gitlab.upsertUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'owner@example.com', admin: true, auditor: false }),
        expect.objectContaining({ cpnUserId: 'o1' }),
      )
    })

    it('should configure repository mirroring if external url is present', async () => {
      const project = makeProjectWithDetails({
        slug: 'project-1',
        repositories: [{
          id: 'r1',
          internalRepoName: 'repo-1',
          externalRepoUrl: 'https://github.com/org/repo.git',
          isPrivate: true,
          externalUserName: 'user',
          isInfra: false,
        }],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })
      const gitlabRepo = makeProjectSchema({ id: 101, name: 'repo-1', path: 'repo-1', path_with_namespace: 'forge/console/project-1/repo-1' })
      const accessToken = makeAccessTokenExposedSchema({
        name: 'bot',
        scopes: ['read_api'],
        access_level: 40,
      })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockReturnValue((async function* () { yield gitlabRepo })())
      gitlab.getOrCreateProjectGroupInternalRepoUrl.mockResolvedValue('https://gitlab.internal/group/repo-1.git')
      gitlab.createMirrorAccessToken.mockResolvedValue(accessToken)
      vault.readTechnReadOnlyCreds.mockResolvedValue(null)
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.createMirrorAccessToken).toHaveBeenCalledWith('project-1')
      expect(gitlab.upsertProjectMirrorRepo).toHaveBeenCalledWith('project-1')

      expect(vault.writeGitlabMirrorCreds).toHaveBeenCalledWith(
        'project-1',
        'repo-1',
        expect.objectContaining({
          GIT_INPUT_URL: 'github.com/org/repo.git',
          GIT_OUTPUT_USER: 'bot',
          GIT_OUTPUT_PASSWORD: accessToken.token,
        }),
      )
      expect(vault.writeTechReadOnlyCreds).toHaveBeenCalledWith('project-1', {
        MIRROR_USER: 'bot',
        MIRROR_TOKEN: accessToken.token,
      })
    })
  })

  describe('handleCron', () => {
    it('should reconcile all projects', async () => {
      const projects = [makeProjectWithDetails({ id: 'p1', slug: 'project-1' })]
      datastore.getAutoSyncProjects.mockResolvedValue(projects)

      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })
      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleCron()

      expect(datastore.getAutoSyncProjects).toHaveBeenCalled()
      expect(gitlab.getOrCreateProjectSubGroup).toHaveBeenCalledWith('project-1')
    })
  })
})
