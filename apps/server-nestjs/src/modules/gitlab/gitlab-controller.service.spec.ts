import type { AccessTokenExposedSchema } from '@gitbeaker/core'
import type { Mocked } from 'vitest'
import { ENABLED } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { AccessLevel } from '@gitbeaker/core'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { VaultService } from '../vault/vault.service'
import { GitlabControllerService } from './gitlab-controller.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { makeExpandedUserSchema, makeGroupSchema, makeMemberSchema, makePipelineTriggerToken, makeProjectSchema, makeProjectWithDetails, makeSimpleUserSchema } from './gitlab-testing.utils'
import { TOPIC_PLUGIN_MANAGED } from './gitlab.constants'
import { GitlabService } from './gitlab.service'

function createGitlabControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      GitlabControllerService,
      {
        provide: GitlabService,
        useValue: {
          getOrCreateProjectSubGroup: vi.fn(),
          getGroupMembers: vi.fn(),
          addGroupMember: vi.fn(),
          editGroupMember: vi.fn(),
          removeGroupMember: vi.fn(),
          getUserByEmail: vi.fn(),
          createUser: vi.fn(),
          getRepos: vi.fn(),
          getProjectToken: vi.fn(),
          getInfraGroupRepoPublicUrl: vi.fn(),
          maybeCommitUpdate: vi.fn(),
          deleteGroup: vi.fn(),
          commitMirror: vi.fn(),
          getOrCreateMirrorPipelineTriggerToken: vi.fn(),
          createProjectToken: vi.fn(),
          createMirrorAccessToken: vi.fn(),
          upsertProjectGroupRepo: vi.fn(),
          upsertProjectMirrorRepo: vi.fn(),
          getProjectGroupInternalRepoUrl: vi.fn(),
          deleteProjectGroupRepo: vi.fn(),
        } satisfies Partial<GitlabService>,
      },
      {
        provide: GitlabDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
        } satisfies Partial<GitlabDatastoreService>,
      },
      {
        provide: VaultService,
        useValue: {
          read: vi.fn(),
          write: vi.fn(),
          delete: vi.fn(),
          readGitlabMirrorCreds: vi.fn(),
          writeGitlabMirrorCreds: vi.fn(),
          deleteGitlabMirrorCreds: vi.fn(),
          readTechnReadOnlyCreds: vi.fn(),
          writeTechReadOnlyCreds: vi.fn(),
          writeMirrorTriggerToken: vi.fn(),
        } satisfies Partial<VaultService>,
      },
      {
        provide: ConfigurationService,
        useValue: {
          projectRootDir: 'forge/console',
          projectRootPath: 'forge',
        },
      },
    ],
  })
}

describe('gitlabControllerService', () => {
  let service: GitlabControllerService
  let gitlab: Mocked<GitlabService>
  let vault: Mocked<VaultService>
  let gitlabDatastore: Mocked<GitlabDatastoreService>

  beforeEach(async () => {
    const moduleRef = await createGitlabControllerServiceTestingModule().compile()
    service = moduleRef.get(GitlabControllerService)
    gitlab = moduleRef.get(GitlabService)
    vault = moduleRef.get(VaultService)
    gitlabDatastore = moduleRef.get(GitlabDatastoreService)

    vault.writeGitlabMirrorCreds.mockResolvedValue(undefined)
    vault.deleteGitlabMirrorCreds.mockResolvedValue(undefined)
    vault.writeTechReadOnlyCreds.mockResolvedValue(undefined)
    vault.writeMirrorTriggerToken.mockResolvedValue(undefined)
    vault.readTechnReadOnlyCreds.mockResolvedValue(null)
    vault.readGitlabMirrorCreds.mockResolvedValue(null)
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
      gitlab.getInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/repo')
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())
      gitlab.getUserByEmail.mockResolvedValue(makeSimpleUserSchema({ id: 123, username: 'user' }))

      await service.handleUpsert(project)

      expect(gitlab.getOrCreateProjectSubGroup).toHaveBeenCalledWith(project.slug)
      expect(gitlab.getGroupMembers).toHaveBeenCalledWith(group.id)
      expect(gitlab.getRepos).toHaveBeenCalledWith(project.slug)
    })

    it('should remove orphan member if purge enabled', async () => {
      const project = makeProjectWithDetails({
        plugins: [{ key: 'purge', value: ENABLED }],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([makeMemberSchema({ id: 999, username: 'orphan' })])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.removeGroupMember).toHaveBeenCalledWith(group.id, 999)
    })

    it('should not remove managed user (bot) even if purge enabled', async () => {
      const project = makeProjectWithDetails({
        plugins: [{ key: 'purge', value: ENABLED }],
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
        plugins: [{ key: 'purge', value: ENABLED }],
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
        plugins: [{ key: 'purge', value: ENABLED }],
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
        members: [{ user: { id: 'u1', email: 'new@example.com', firstName: 'New', lastName: 'User', adminRoleIds: [] }, roleIds: [] }],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getUserByEmail.mockResolvedValue(null)
      gitlab.createUser.mockImplementation(async (email, username, name) => {
        return makeExpandedUserSchema({
          id: email === 'new@example.com' ? 999 : 998,
          email,
          username,
          name,
        })
      })
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleUpsert(project)

      expect(gitlab.createUser).toHaveBeenCalledWith('new@example.com', 'new.example.com', 'New User')
      expect(gitlab.createUser).toHaveBeenCalledWith('owner@example.com', 'owner.example.com', 'Owner User')
      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group.id, 999, AccessLevel.GUEST)
      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group.id, 998, AccessLevel.OWNER)
    })

    it('should configure repository mirroring if external url is present', async () => {
      const project = makeProjectWithDetails({
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
      const accessToken = {
        id: 1,
        user_id: 1,
        scopes: ['read_api'],
        name: 'bot',
        expires_at: faker.date.future().toISOString(),
        active: true,
        created_at: faker.date.past().toISOString(),
        revoked: false,
        access_level: 40,
        token: faker.internet.password(),
      } satisfies AccessTokenExposedSchema

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockReturnValue((async function* () { yield gitlabRepo })())
      gitlab.getProjectGroupInternalRepoUrl.mockResolvedValue('https://gitlab.internal/group/repo-1.git')
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
      gitlabDatastore.getAllProjects.mockResolvedValue(projects)

      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })
      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue(makeProjectSchema({ id: 1, name: 'mirror', path: 'mirror', path_with_namespace: 'forge/console/project-1/mirror', empty_repo: false }))
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue(makePipelineTriggerToken())

      await service.handleCron()

      expect(gitlabDatastore.getAllProjects).toHaveBeenCalled()
      expect(gitlab.getOrCreateProjectSubGroup).toHaveBeenCalledWith('project-1')
    })
  })
})
