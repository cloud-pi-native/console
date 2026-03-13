import { faker } from '@faker-js/faker'
import type { SimpleUserSchema, ExpandedUserSchema, MemberSchema, GroupSchema, ProjectSchema, PipelineTriggerTokenSchema, OffsetPagination, AccessTokenSchema, AccessTokenExposedSchema, RepositoryFileExpandedSchema, RepositoryTreeSchema } from '@gitbeaker/core'
import { AccessLevel } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { VaultError } from '../vault/vault-client.service'
import type { ProjectWithDetails } from './gitlab-datastore.service'

export function notFoundError(method: string, path: string) {
  return new VaultError('NotFound', 'Not Found', { status: 404, method, path })
}

export function makeSimpleUserSchema(overrides: Partial<SimpleUserSchema> = {}) {
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

export function makeExpandedUserSchema(overrides: Partial<ExpandedUserSchema> = {}): ExpandedUserSchema {
  const isoDate = faker.date.past().toISOString()
  return {
    id:  1,
    name: 'User',
    username: 'user',
    state: 'active',
    avatar_url: '',
    web_url: 'https://gitlab.example/users/user',
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
    email: 'user@example.com',
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
    ...overrides,
  } satisfies ExpandedUserSchema
}

export function makeMemberSchema(overrides: Partial<MemberSchema> = {}) {
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

export function makeGroupSchema(overrides: Partial<GroupSchema> = {}) {
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

export function makeProjectSchema(overrides: Partial<ProjectSchema> = {}) {
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

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}) {
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

export function makePipelineTriggerToken(overrides: Partial<PipelineTriggerTokenSchema> = {}) {
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

export function makeOffsetPagination(overrides: Partial<OffsetPagination> = {}) {
  return {
    total: 1,
    next: null,
    current: 1,
    previous: null,
    perPage: 20,
    totalPages: 1,
    ...overrides,
  } satisfies OffsetPagination
}

export function makeAccessTokenSchema(overrides: Partial<AccessTokenSchema> = {}) {
  const isoDate = faker.date.past().toISOString()
  return {
    id: 1,
    user_id: 1,
    name: 'token',
    expires_at: isoDate,
    active: true,
    created_at: isoDate,
    revoked: false,
    access_level: AccessLevel.DEVELOPER,
    ...overrides,
  } satisfies AccessTokenSchema
}

export function makeAccessTokenExposedSchema(overrides: Partial<AccessTokenExposedSchema> = {}) {
  return {
    ...makeAccessTokenSchema(),
    token: 'secret-token',
    ...overrides,
  } satisfies AccessTokenExposedSchema
}

export function makeRepositoryFileExpandedSchema(overrides: Partial<RepositoryFileExpandedSchema> = {}) {
  return {
    file_name: 'file.txt',
    file_path: 'file.txt',
    size: 7,
    encoding: 'base64',
    content: 'content',
    content_sha256: 'sha256',
    ref: 'main',
    blob_id: 'blob',
    commit_id: 'commit',
    last_commit_id: 'last-commit',
    ...overrides,
  } satisfies RepositoryFileExpandedSchema
}

export function makeRepositoryTreeSchema(overrides: Partial<RepositoryTreeSchema> = {}) {
  return {
    id: 'id',
    name: 'file.txt',
    type: 'blob',
    path: 'file.txt',
    mode: '100644',
    ...overrides,
  } satisfies RepositoryTreeSchema
}

export function makeGitbeakerRequestError(params: { message?: string, status?: number, statusText?: string, description: string }) {
  const request = new Request('https://gitlab.internal.example/api')
  const response = new Response(null, { status: params.status ?? 404, statusText: params.statusText ?? 'Not Found' })
  return new GitbeakerRequestError(params.message ?? params.statusText ?? 'Error', {
    cause: {
      description: params.description,
      request,
      response,
    },
  })
}
