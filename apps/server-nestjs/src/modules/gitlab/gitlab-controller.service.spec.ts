import { Test } from '@nestjs/testing'
import { ENABLED } from '@cpn-console/shared'
import { GitlabControllerService } from './gitlab-controller.service'
import { GitlabService } from './gitlab.service'
import type { ProjectWithDetails } from './gitlab-datastore.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { VaultService } from '../vault/vault.service'
import { VaultError } from '../vault/vault-client.service'
import type { VaultResult } from '../vault/vault-client.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { vi, describe, beforeEach, it, expect } from 'vitest'
import type { Mocked } from 'vitest'
import type { AccessTokenExposedSchema, ExpandedUserSchema, GroupSchema, MemberSchema, PipelineTriggerTokenSchema, ProjectSchema, SimpleUserSchema } from '@gitbeaker/core'
import { AccessLevel } from '@gitbeaker/core'
import { faker } from '@faker-js/faker'

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
          destroy: vi.fn(),
          readGitlabMirrorCreds: vi.fn(),
          writeGitlabMirrorCreds: vi.fn(),
          deleteGitlabMirrorCreds: vi.fn(),
          readMirrorCreds: vi.fn(),
          writeMirrorCreds: vi.fn(),
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

function ok<T>(data: T): VaultResult<T> {
  return { data, error: null }
}

function notFound(method: string, path: string): VaultResult<never> {
  return { data: null, error: new VaultError('NotFound', 'Not Found', { status: 404, method, path }) }
}

function makeSimpleUserSchema(overrides: Partial<SimpleUserSchema> = {}) {
  return {
    id: 1,
    name: 'User',
    username: 'user',
    state: 'active',
    avatar_url: '',
    web_url: 'https://gitlab.example/users/user',
    created_at: faker.date.past().toISOString(),
    ...overrides,
  } satisfies SimpleUserSchema
}

function makeExpandedUserSchema(params: { id: number, email: string, username: string, name: string }): ExpandedUserSchema {
  const isoDate = faker.date.past().toISOString()
  return {
    id: params.id,
    name: params.name,
    username: params.username,
    state: 'active',
    avatar_url: '',
    web_url: `https://gitlab.example/users/${params.username}`,
    created_at: isoDate,
    locked: null,
    bio: null,
    bot: false,
    location: null,
    public_email: null,
    skype: null,
    linkedin: null,
    twitter: null,
    discord: null,
    website_url: null,
    pronouns: null,
    organization: null,
    job_title: null,
    work_information: null,
    followers: null,
    following: null,
    local_time: null,
    is_followed: null,
    is_admin: null,
    last_sign_in_at: isoDate,
    confirmed_at: isoDate,
    last_activity_on: isoDate,
    email: params.email,
    theme_id: 1,
    color_scheme_id: 1,
    projects_limit: 0,
    current_sign_in_at: null,
    note: null,
    identities: null,
    can_create_group: false,
    can_create_project: false,
    two_factor_enabled: false,
    external: false,
    private_profile: null,
    namespace_id: null,
    created_by: null,
  } satisfies ExpandedUserSchema
}

function makeMemberSchema(overrides: Partial<MemberSchema> = {}) {
  return {
    id: 1,
    username: 'user',
    name: 'User',
    state: 'active',
    avatar_url: '',
    web_url: 'https://gitlab.example/users/user',
    expires_at: faker.date.future().toISOString(),
    access_level: 30,
    email: 'user@example.com',
    group_saml_identity: {
      extern_uid: '',
      provider: '',
      saml_provider_id: 1,
    },
    ...overrides,
  } satisfies MemberSchema
}

function makeGroupSchema(overrides: Partial<GroupSchema> = {}) {
  return {
    id: 123,
    web_url: 'https://gitlab.example/groups/forge',
    name: 'forge',
    avatar_url: '',
    full_name: 'forge',
    full_path: 'forge',
    path: 'forge',
    description: '',
    visibility: 'private',
    share_with_group_lock: false,
    require_two_factor_authentication: false,
    two_factor_grace_period: 0,
    project_creation_level: 'maintainer',
    subgroup_creation_level: 'maintainer',
    lfs_enabled: true,
    default_branch_protection: 0,
    request_access_enabled: false,
    created_at: faker.date.past().toISOString(),
    parent_id: 0,
    ...overrides,
  } satisfies GroupSchema
}

function makeProjectSchema(overrides: Partial<ProjectSchema> = {}) {
  return {
    id: 1,
    web_url: 'https://gitlab.example/projects/1',
    name: 'repo',
    path: 'repo',
    description: '',
    name_with_namespace: 'forge / repo',
    path_with_namespace: 'forge/repo',
    created_at: faker.date.past().toISOString(),
    default_branch: 'main',
    topics: [],
    ssh_url_to_repo: 'ssh://gitlab.example/forge/repo.git',
    http_url_to_repo: 'https://gitlab.example/forge/repo.git',
    readme_url: '',
    forks_count: 0,
    avatar_url: null,
    star_count: 0,
    last_activity_at: faker.date.future().toISOString(),
    namespace: { id: 1, name: 'forge', path: 'forge', kind: 'group', full_path: 'forge', avatar_url: '', web_url: 'https://gitlab.example/groups/forge' },
    description_html: '',
    visibility: 'private',
    empty_repo: false,
    owner: { id: 1, name: 'Owner', created_at: faker.date.past().toISOString() },
    issues_enabled: true,
    open_issues_count: 0,
    merge_requests_enabled: true,
    jobs_enabled: true,
    wiki_enabled: true,
    snippets_enabled: true,
    can_create_merge_request_in: true,
    resolve_outdated_diff_discussions: false,
    container_registry_access_level: 'enabled',
    security_and_compliance_access_level: 'enabled',
    container_expiration_policy: {
      cadence: '1d',
      enabled: false,
      keep_n: null,
      older_than: null,
      name_regex_delete: null,
      name_regex_keep: null,
      next_run_at: faker.date.future().toISOString(),
    },
    updated_at: faker.date.past().toISOString(),
    creator_id: 1,
    import_url: null,
    import_type: null,
    import_status: 'none',
    import_error: null,
    permissions: {
      project_access: { access_level: 0, notification_level: 0 },
      group_access: { access_level: 0, notification_level: 0 },
    },
    archived: false,
    license_url: '',
    license: { key: 'mit', name: 'MIT', nickname: 'MIT', html_url: '', source_url: '' },
    shared_runners_enabled: true,
    group_runners_enabled: true,
    runners_token: '',
    ci_default_git_depth: 0,
    ci_forward_deployment_enabled: false,
    ci_forward_deployment_rollback_allowed: false,
    ci_allow_fork_pipelines_to_run_in_parent_project: false,
    ci_separated_caches: false,
    ci_restrict_pipeline_cancellation_role: '',
    public_jobs: false,
    shared_with_groups: null,
    repository_storage: '',
    only_allow_merge_if_pipeline_succeeds: false,
    allow_merge_on_skipped_pipeline: false,
    restrict_user_defined_variables: false,
    only_allow_merge_if_all_discussions_are_resolved: false,
    remove_source_branch_after_merge: false,
    printing_merge_requests_link_enabled: false,
    request_access_enabled: false,
    merge_method: '',
    squash_option: '',
    auto_devops_enabled: false,
    auto_devops_deploy_strategy: '',
    mirror: false,
    mirror_user_id: 1,
    mirror_trigger_builds: false,
    only_mirror_protected_branches: false,
    mirror_overwrites_diverged_branches: false,
    external_authorization_classification_label: '',
    packages_enabled: false,
    service_desk_enabled: false,
    service_desk_address: 'service-desk@example.com',
    service_desk_reply_to: 'service-desk@example.com',
    autoclose_referenced_issues: false,
    suggestion_commit_message: 'Add suggestion commit message',
    enforce_auth_checks_on_uploads: false,
    merge_commit_template: 'Add suggestion commit message',
    squash_commit_template: 'Add suggestion commit message',
    issue_branch_template: 'Add suggestion commit message',
    marked_for_deletion_on: faker.date.future().toISOString(),
    compliance_frameworks: [],
    warn_about_potentially_unwanted_characters: false,
    container_registry_image_prefix: 'registry.gitlab.example/forge/repo',
    _links: {
      self: 'https://gitlab.example/projects/1',
      issues: 'https://gitlab.example/projects/1/issues',
      merge_requests: 'https://gitlab.example/projects/1/merge_requests',
      repo_branches: 'https://gitlab.example/projects/1/repository/branches',
      labels: 'https://gitlab.example/projects/1/labels',
      events: 'https://gitlab.example/projects/1/events',
      members: 'https://gitlab.example/projects/1/members',
      cluster_agents: 'https://gitlab.example/projects/1/cluster_agents',
    },
    ...overrides,
  } satisfies ProjectSchema
}

function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}) {
  return {
    id: 'p1',
    slug: 'project-1',
    name: 'Project 1',
    description: 'Test project',
    owner: { id: 'o1', email: 'owner@example.com', firstName: 'Owner', lastName: 'User', adminRoleIds: [] },
    plugins: [],
    roles: [],
    members: [],
    repositories: [],
    clusters: [],
    ...overrides,
  } satisfies ProjectWithDetails
}

function makePipelineTriggerToken(overrides: Partial<PipelineTriggerTokenSchema> = {}) {
  return {
    id: 1,
    description: 'mirroring-from-external-repo',
    created_at: faker.date.past().toISOString(),
    last_used: null,
    token: 'trigger-token',
    updated_at: faker.date.past().toISOString(),
    owner: null,
    repoId: 1,
    ...overrides,
  } satisfies PipelineTriggerTokenSchema
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

    vault.writeGitlabMirrorCreds.mockResolvedValue(ok(undefined))
    vault.deleteGitlabMirrorCreds.mockResolvedValue(ok(undefined))
    vault.writeMirrorCreds.mockResolvedValue(ok(undefined))
    vault.writeMirrorTriggerToken.mockResolvedValue(ok(undefined))
    vault.readMirrorCreds.mockResolvedValue(notFound('GET', '/v1/kv/data/forge/project-1/tech/GITLAB_MIRROR'))
    vault.readGitlabMirrorCreds.mockResolvedValue(notFound('GET', '/v1/kv/data/forge/project-1/repo-1-mirror'))
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
      gitlab.getInfraGroupRepoPublicUrl.mockResolvedValue('http://gitlab/repo')
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

    it('should create gitlab user if not exists', async () => {
      const project = makeProjectWithDetails({
        members: [{ user: { id: 'u1', email: 'new@example.com', firstName: 'New', lastName: 'User', adminRoleIds: [] }, roleIds: [] }],
      })
      const group = makeGroupSchema({ id: 123, name: 'project-1', path: 'project-1', full_path: 'forge/console/project-1', full_name: 'forge/console/project-1', parent_id: 1 })

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getUserByEmail.mockResolvedValue(undefined as unknown as SimpleUserSchema)
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
        token: 'mirror-token',
      } satisfies AccessTokenExposedSchema

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockReturnValue((async function* () { yield gitlabRepo })())
      gitlab.getProjectGroupInternalRepoUrl.mockResolvedValue('https://gitlab.internal/group/repo-1.git')
      gitlab.createMirrorAccessToken.mockResolvedValue(accessToken)
      vault.readMirrorCreds.mockResolvedValue(notFound('GET', '/v1/kv/data/forge/project-1/tech/GITLAB_MIRROR'))
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
          GIT_OUTPUT_PASSWORD: 'mirror-token',
        }),
      )
      expect(vault.writeMirrorCreds).toHaveBeenCalledWith('project-1', {
        MIRROR_USER: 'bot',
        MIRROR_TOKEN: 'mirror-token',
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
