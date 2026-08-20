import type { CondensedGroupSchema, MemberSchema } from '@gitbeaker/core'
import type { ConfigType } from '@nestjs/config'
import type { RepositorySyncEventPayload } from '../events/app-events.service'
import { AppEventsService } from '../events/app-events.service'
import type { RequiredPluginResult } from '../plugin/plugin.utils'
import type { MirrorUserSecret } from '../vault/vault-client.service'
import type { ProjectWithDetails } from './gitlab-datastore.service'
import { specificallyEnabled } from '@cpn-console/hooks'
import { AccessLevel } from '@gitbeaker/core'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { getAll } from '../../utils/iterable.utils'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { capturePluginResult } from '../plugin/plugin.utils'
import { VaultClientService } from '../vault/vault-client.service'
import { GitlabClientService } from './gitlab-client.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import {
  ADMIN_GROUP_PATH_PLUGIN_KEY,
  AUDITOR_GROUP_PATH_PLUGIN_KEY,
  DEFAULT_ADMIN_GROUP_PATH,
  DEFAULT_AUDITOR_GROUP_PATH,
  DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX,
  GITLAB_CI_CONFIG_PATH,
  INFRA_APPS_REPO_NAME,
  PLUGIN_NAME,
  PROJECT_DEVELOPER_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PROJECT_MAINTAINER_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PROJECT_REPORTER_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PURGE_PLUGIN_KEY,
} from './gitlab.constants'
import {
  adminRoleFlag,
  generateAccessLevelMapping,
  generateAdminRoleMapping,
  generateName,
  generateProjectRoleGroupPath,
  generateUsername,
  generateUsernameCandidates,
  getProjectPluginConfig,
  isOwnedRepo,
  isOwnedUser,
  isSystemRepo,
} from './gitlab.utils'

type ProjectAccessLevel = Exclude<AccessLevel, (typeof AccessLevel)['ADMIN']>

@Injectable()
export class GitlabService {
  private readonly logger = new Logger(GitlabService.name)

  constructor(
    @Inject(GitlabDatastoreService) private readonly datastore: GitlabDatastoreService,
    @Inject(GitlabClientService) private readonly gitlab: GitlabClientService,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
    @Inject(gitlabConfigFactory.KEY) private readonly gitlabConfig: ConfigType<typeof gitlabConfigFactory>,
    @Inject(AppEventsService) private readonly appEvents: AppEventsService,
  ) {
    this.logger.log('GitLabService initialized')
  }

  @OnEvent('project.upsert')
  async handleUpsert(project: ProjectWithDetails): Promise<RequiredPluginResult<'gitlab'>> {
    return capturePluginResult('gitlab', () => this.syncProject(project))
  }

  @StartActiveSpan()
  private async syncProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project upsert event for ${project.slug}`)
    await this.ensureProjectGroup(project)
    this.logger.log(`GitLab sync completed for project ${project.slug}`)
  }

  @OnEvent('project.delete')
  async handleDelete(project: ProjectWithDetails): Promise<RequiredPluginResult<'gitlab'>> {
    return capturePluginResult('gitlab', () => this.cleanupProject(project))
  }

  @OnEvent('repository.sync')
  async handleRepositorySync(payload: RepositorySyncEventPayload): Promise<RequiredPluginResult<'gitlab'>> {
    return capturePluginResult('gitlab', () => this.syncRepositoryMirror(payload))
  }

  @StartActiveSpan()
  private async syncRepositoryMirror(payload: RepositorySyncEventPayload) {
    const { projectSlug, internalRepoName, syncAllBranches } = payload
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('repository.name', internalRepoName)
    this.logger.log(`Handling a repository sync event for ${projectSlug}/${internalRepoName}`)
    // A full sync has no branch to designate; the client turns that into an empty
    // GIT_BRANCH_DEPLOY, which is what the mirror pipeline expects.
    await this.gitlab.triggerMirror(
      projectSlug,
      internalRepoName,
      syncAllBranches,
      payload.syncAllBranches ? undefined : payload.branchName,
    )
    this.logger.log(`GitLab mirror pipeline triggered for ${projectSlug}/${internalRepoName}`)
  }

  @StartActiveSpan()
  private async cleanupProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project delete event for ${project.slug}`)
    const projectGroupPath = `${this.gitlabConfig.projectRootDir}/${project.slug}`
    const group = await this.gitlab.getGroupByPath(projectGroupPath)
    if (group) {
      await this.gitlab.deleteGroup(group)
    }
    this.logger.log(`GitLab cleanup completed for project ${project.slug}`)
  }

  // @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    const span = trace.getActiveSpan()
    span?.setAttribute('gitlab.projects.count', 0)
    this.logger.log('Starting GitLab reconciliation')
    const projects = await this.datastore.getAllProjects()
    span?.setAttribute('gitlab.projects.count', projects.length)
    this.logger.log(`Loaded ${projects.length} projects for GitLab reconciliation`)
    await this.ensureProjectGroups(projects)
    this.logger.log(`GitLab reconciliation completed (${projects.length})`)
  }

  @StartActiveSpan()
  private async ensureProjectGroups(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('gitlab.projects.count', projects.length)
    this.logger.verbose(`Reconciling GitLab project groups (${projects.length})`)
    await Promise.all(projects.map(p => this.ensureProjectGroup(p)))
  }

  @StartActiveSpan()
  private async ensureProjectGroup(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.verbose(`Reconciling GitLab project group (${project.slug})`)
    const group = await this.gitlab.getOrCreateProjectSubGroup(project.slug)
    const members = await this.gitlab.getGroupMembers(group)
    this.logger.verbose(`Loaded GitLab project group state (${project.slug}): groupId=${group.id} members=${members.length}`)
    await this.ensureProjectGroupMembers(project, group, members)
    await this.ensureProjectRepos(project)
    await this.purgeOrphanRepos(project)
    await this.ensureSystemRepos(project)
    // Emit after ensureSystemRepos so the mirror repo + trigger token exist before
    // triggerMirror runs. Repos added via the manifest are configured here but never
    // launched by the HTTP create path, so they need the kick during reconciliation.
    await this.emitMirrorSyncs(project)
    this.logger.verbose(`GitLab project group reconciled (${project.slug})`)
  }

  @StartActiveSpan()
  private async emitMirrorSyncs(project: ProjectWithDetails) {
    const externalRepos = project.repositories.filter(repo => repo.externalRepoUrl)
    await Promise.all(externalRepos.map(repo =>
      this.appEvents.emitRepositoryEvent('repository.sync', {
        projectId: project.id,
        projectSlug: project.slug,
        internalRepoName: repo.internalRepoName,
        syncAllBranches: true,
      }, { action: 'Sync Repository' })
        .catch(error => this.logger.warn(
          `Mirror sync emit failed during reconcile (project=${project.slug}, repo=${repo.internalRepoName})`,
          error,
        )),
    ))
  }

  @StartActiveSpan()
  private async ensureProjectGroupMembers(
    project: ProjectWithDetails,
    group: CondensedGroupSchema,
    members: MemberSchema[],
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.verbose(`Reconciling GitLab group members for project ${project.slug} (groupId=${group.id}, members=${members.length})`)
    const { adminRoleId, auditorRoleId } = await this.getAdminRoleIds(project)
    await this.addMissingMembers(project, group, members, adminRoleId, auditorRoleId)
    await this.addMissingOwnerMember(project, group, members, adminRoleId, auditorRoleId)
    await this.purgeOrphanMembers(project, group, members)
  }

  private async addMissingMembers(
    project: ProjectWithDetails,
    group: CondensedGroupSchema,
    members: MemberSchema[],
    adminRoleId?: string,
    auditorRoleId?: string,
  ) {
    const membersById = new Map(members.map(m => [m.id, m]))
    const groupPaths = await this.getProjectRoleGroupPaths(project)
    const accessLevelByUserId = generateAccessLevelMapping(project, groupPaths)

    await Promise.all(project.members.map(async ({ user }) => {
      const gitlabUser = await this.gitlab.upsertUser({
        email: user.email,
        username: generateUsername(user.email),
        name: generateName(user.firstName, user.lastName),
        admin: adminRoleFlag(user, adminRoleId),
        auditor: adminRoleFlag(user, auditorRoleId),
      }, {
        cpnUserId: user.id,
      })
      if (!gitlabUser) {
        this.logger.warn(`Unable to resolve a GitLab user for a project member (project=${project.slug}, userId=${user.id}, email=${user.email})`)
        return
      }
      const accessLevel = accessLevelByUserId.get(user.id) ?? AccessLevel.GUEST
      await this.ensureGroupMemberAccessLevel(group, gitlabUser.id, accessLevel, membersById)
    }))
  }

  private async ensureGroupMemberAccessLevel(
    group: CondensedGroupSchema,
    gitlabUserId: number,
    accessLevel: ProjectAccessLevel,
    membersById: Map<number, MemberSchema>,
  ) {
    const existingMember = membersById.get(gitlabUserId)

    if (accessLevel === AccessLevel.NO_ACCESS) {
      if (existingMember) {
        await this.gitlab.removeGroupMember(group, gitlabUserId)
      }
      return
    }

    if (!existingMember) {
      await this.gitlab.addGroupMember(group, gitlabUserId, accessLevel)
      return
    }

    if (existingMember.access_level !== accessLevel) {
      await this.gitlab.editGroupMember(group, gitlabUserId, accessLevel)
    }
  }

  private async addMissingOwnerMember(
    project: ProjectWithDetails,
    group: CondensedGroupSchema,
    members: MemberSchema[],
    adminRoleId?: string,
    auditorRoleId?: string,
  ) {
    const gitlabUser = await this.gitlab.upsertUser({
      email: project.owner.email,
      username: generateUsername(project.owner.email),
      name: generateName(project.owner.firstName, project.owner.lastName),
      admin: adminRoleFlag(project.owner, adminRoleId),
      auditor: adminRoleFlag(project.owner, auditorRoleId),
    }, {
      cpnUserId: project.owner.id,
    })
    if (!gitlabUser) {
      this.logger.warn(`Unable to resolve the GitLab owner account (project=${project.slug}, ownerId=${project.owner.id}, email=${project.owner.email})`)
      return
    }
    const membersById = new Map(members.map(m => [m.id, m]))
    await this.ensureGroupMemberAccessLevel(group, gitlabUser.id, AccessLevel.OWNER, membersById)
  }

  private async getAdminRoleIds(project: ProjectWithDetails): Promise<{ adminRoleId?: string, auditorRoleId?: string }> {
    const adminGroupPath = await this.getAdminGroupPath(project)
    const auditorGroupPath = await this.getAuditorGroupPath(project)
    const roles = await this.datastore.getAdminRolesByOidcGroups([adminGroupPath, auditorGroupPath])
    return generateAdminRoleMapping(roles, adminGroupPath, auditorGroupPath)
  }

  private async getAdminGroupPath(project: ProjectWithDetails): Promise<string> {
    return await this.getAdminOrProjectPluginConfig(project, ADMIN_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_ADMIN_GROUP_PATH
  }

  private async getAuditorGroupPath(project: ProjectWithDetails): Promise<string> {
    return await this.getAdminOrProjectPluginConfig(project, AUDITOR_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_AUDITOR_GROUP_PATH
  }

  private async getAdminOrProjectPluginConfig(project: ProjectWithDetails, key: string): Promise<string | undefined> {
    const adminPluginConfig = await this.datastore.getAdminPluginConfig(PLUGIN_NAME, key)
    if (adminPluginConfig) return adminPluginConfig
    if (!project) return undefined
    return getProjectPluginConfig(project, key) ?? undefined
  }

  private async getProjectRoleGroupPaths(project: ProjectWithDetails): Promise<{ reporter: string[], developer: string[], maintainer: string[] }> {
    const [reporter, developer, maintainer] = await Promise.all([
      this.getProjectReporterGroupPaths(project),
      this.getProjectDeveloperGroupPaths(project),
      this.getProjectMaintainerGroupPaths(project),
    ])

    return {
      reporter,
      developer,
      maintainer,
    }
  }

  private async getProjectReporterGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const projectConfig = getProjectPluginConfig(project, PROJECT_REPORTER_GROUP_PATH_SUFFIX_PLUGIN_KEY)
    const globalConfig = await this.getAdminOrProjectPluginConfig(project, PROJECT_REPORTER_GROUP_PATH_SUFFIX_PLUGIN_KEY)
    const raw = projectConfig ?? globalConfig ?? DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectDeveloperGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const projectConfig = getProjectPluginConfig(project, PROJECT_DEVELOPER_GROUP_PATH_SUFFIX_PLUGIN_KEY)
    const globalConfig = await this.getAdminOrProjectPluginConfig(project, PROJECT_DEVELOPER_GROUP_PATH_SUFFIX_PLUGIN_KEY)
    const raw = projectConfig ?? globalConfig ?? DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectMaintainerGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const projectConfig = getProjectPluginConfig(project, PROJECT_MAINTAINER_GROUP_PATH_SUFFIX_PLUGIN_KEY)
    const globalConfig = await this.getAdminOrProjectPluginConfig(project, PROJECT_MAINTAINER_GROUP_PATH_SUFFIX_PLUGIN_KEY)
    const raw = projectConfig ?? globalConfig ?? DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  @StartActiveSpan()
  private async purgeOrphanMembers(
    project: ProjectWithDetails,
    group: CondensedGroupSchema,
    members: MemberSchema[],
  ) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'group.id': group.id,
      'members.total': members.length,
    })
    const purgeConfig = getProjectPluginConfig(project, PURGE_PLUGIN_KEY)
    const usernames = new Set([
      ...generateUsernameCandidates(project.owner.email),
      ...project.members.flatMap(m => generateUsernameCandidates(m.user.email)),
    ])
    const emails = new Set([
      project.owner.email.toLowerCase(),
      ...project.members.map(m => m.user.email.toLowerCase()),
    ])

    const orphans = members.filter((member) => {
      if (isOwnedUser(member)) return false
      if (usernames.has(member.username)) return false
      if (member.email && emails.has(member.email.toLowerCase())) return false
      return true
    })
    span?.setAttribute('orphans.count', orphans.length)

    if (specificallyEnabled(purgeConfig)) {
      span?.setAttribute('purge.enabled', true)
      let removedCount = 0
      await Promise.all(orphans.map(async (orphan) => {
        await this.gitlab.removeGroupMember(group, orphan.id)
        removedCount++
        this.logger.log(`Removed a user from the GitLab group (groupId=${group.id}, username=${orphan.username})`)
      }))
      span?.setAttribute('orphans.removed.count', removedCount)
    } else {
      span?.setAttribute('purge.enabled', false)
      let warnedCount = 0
      for (const orphan of orphans) {
        warnedCount++
        this.logger.warn(`User is in the GitLab group but not in the project (purge disabled, username=${orphan.username})`)
      }
      span?.setAttribute('orphans.warned.count', warnedCount)
    }
  }

  @StartActiveSpan()
  private async ensureProjectRepos(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'repositories.count': project.repositories.length,
    })
    let mirroringEnabledCount = 0
    let mirroringDisabledCount = 0
    for (const repo of project.repositories) {
      const externalHost = this.getExternalRepoHost(repo.externalRepoUrl)
      span?.addEvent('gitlab.repo.reconcile', {
        'repository.name': repo.internalRepoName,
        'repository.isPrivate': repo.isPrivate,
        ...(externalHost ? { 'repository.external.host': externalHost } : {}),
        'repository.external': !!repo.externalRepoUrl,
      })
      await this.gitlab.upsertProjectGroupRepo(
        project.slug,
        repo.internalRepoName,
        undefined,
        repo.externalRepoUrl ? GITLAB_CI_CONFIG_PATH : undefined,
      )

      if (repo.externalRepoUrl) {
        span?.setAttribute('repository.mirroring', true)
        mirroringEnabledCount++
        await this.configureRepositoryMirroring(project, repo)
      } else {
        span?.setAttribute('repository.mirroring', false)
        mirroringDisabledCount++
        await this.vault.deleteGitlabMirrorCreds(project.slug, repo.internalRepoName)
      }
    }
    span?.setAttribute('repositories.mirroring.enabled.count', mirroringEnabledCount)
    span?.setAttribute('repositories.mirroring.disabled.count', mirroringDisabledCount)
  }

  @StartActiveSpan()
  private async purgeOrphanRepos(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    const gitlabRepositories = await getAll(this.gitlab.getRepos(project.slug))
    span?.setAttribute('gitlab.repositories.count', gitlabRepositories.length)

    const orphanRepos = gitlabRepositories.filter(r => isOwnedRepo(r) && !isSystemRepo(project, r))
    span?.setAttribute('orphan.repositories.count', orphanRepos.length)

    if (specificallyEnabled(getProjectPluginConfig(project, PURGE_PLUGIN_KEY))) {
      span?.setAttribute('purge.enabled', true)
      let removedCount = 0
      await Promise.all(orphanRepos.map(async (orphan) => {
        await this.gitlab.deleteProjectGroupRepo(project.slug, orphan.name)
        removedCount++
        this.logger.log(`Removed a repository from the GitLab project (project=${project.slug}, repoName=${orphan.name})`)
      }))

      span?.setAttribute('orphan.repositories.removed.count', removedCount)
    } else {
      span?.setAttribute('purge.enabled', false)
      let warnedCount = 0
      for (const orphan of orphanRepos) {
        warnedCount++
        this.logger.warn(`Repository is in GitLab but not in the project definition (purge disabled, project=${project.slug}, repoName=${orphan.name})`)
      }
      span?.setAttribute('managed.repositories.warned.count', warnedCount)
    }
  }

  @StartActiveSpan()
  private async configureRepositoryMirroring(
    project: ProjectWithDetails,
    repo: ProjectWithDetails['repositories'][number],
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('repository.internalRepoName', repo.internalRepoName)
    span?.setAttribute('repository.isPrivate', repo.isPrivate)
    const externalHost = this.getExternalRepoHost(repo.externalRepoUrl)
    if (externalHost) span?.setAttribute('repository.external.host', externalHost)

    const currentVaultSecret = await this.vault.readGitlabMirrorCreds(project.slug, repo.internalRepoName)
    span?.setAttribute('vault.secret.exists', !!currentVaultSecret)
    if (!currentVaultSecret) {
      this.logger.warn(`No existing mirror credentials found in Vault; rotating new credentials (project=${project.slug}, repoName=${repo.internalRepoName})`)
    }

    const internalRepoUrl = await this.gitlab.getOrCreateProjectGroupInternalRepoUrl(project.slug, repo.internalRepoName)
    const externalRepoUrn = repo.externalRepoUrl.split('://')[1]
    const internalRepoUrn = internalRepoUrl.split('://')[1]
    span?.setAttribute('repository.externalRepoUrn', externalRepoUrn)
    span?.setAttribute('repository.internalRepoUrn', internalRepoUrn)

    const projectMirrorCreds = await this.getOrRotateMirrorCreds(project)

    const mirrorSecretData = {
      GIT_INPUT_URL: externalRepoUrn,
      GIT_INPUT_USER: repo.isPrivate ? repo.externalUserName : undefined,
      GIT_INPUT_PASSWORD: currentVaultSecret?.data?.GIT_INPUT_PASSWORD, // Preserve existing password as it's not in DB
      GIT_OUTPUT_URL: internalRepoUrn,
      GIT_OUTPUT_USER: projectMirrorCreds.MIRROR_USER,
      GIT_OUTPUT_PASSWORD: projectMirrorCreds.MIRROR_TOKEN,
    }

    // Write to vault if changed
    // Using simplified check
    await this.vault.writeGitlabMirrorCreds(project.slug, repo.internalRepoName, mirrorSecretData)
    span?.setAttribute('vault.secret.written', true)
  }

  @StartActiveSpan()
  private async ensureSystemRepos(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    await Promise.all([
      this.ensureInfraAppsRepo(project),
      this.ensureMirrorRepo(project),
    ])
  }

  private async ensureInfraAppsRepo(project: ProjectWithDetails) {
    await this.gitlab.upsertProjectGroupRepo(project.slug, INFRA_APPS_REPO_NAME)
  }

  private async ensureMirrorRepo(project: ProjectWithDetails) {
    const mirrorRepo = await this.gitlab.upsertProjectMirrorRepo(project.slug)
    if (mirrorRepo.empty_repo) {
      await this.gitlab.commitMirror(mirrorRepo.id)
    }
    await this.ensureMirrorRepoTriggerToken(project)
  }

  @StartActiveSpan()
  private async ensureMirrorRepoTriggerToken(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    const triggerToken = await this.gitlab.getOrCreateMirrorPipelineTriggerToken(project.slug)
    const gitlabSecret = {
      PROJECT_SLUG: project.slug,
      GIT_MIRROR_PROJECT_ID: triggerToken.repoId,
      GIT_MIRROR_TOKEN: triggerToken.token,
    }
    await this.vault.writeMirrorTriggerToken(project.slug, gitlabSecret)
    span?.setAttribute('vault.secret.written', true)
  }

  @StartActiveSpan()
  private async getOrRotateMirrorCreds(project: ProjectWithDetails): Promise<MirrorUserSecret> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    const group = await this.gitlab.getProjectGroup(project.slug)
    if (!group) throw new Error(`No group found for project ${project.slug}`)
    const currentToken = await this.gitlab.getProjectToken(group, project.slug)
    if (currentToken) {
      const vaultSecret = await this.getMirrorTokenFromVault(project)
      if (vaultSecret) {
        span?.setAttribute('mirror.creds.rotated', false)
        return vaultSecret
      }
      this.logger.warn(`Mirror token invalid or vault secret missing, revoking (projectSlug=${project.slug}, tokenId=${currentToken.id})`)
      span?.setAttribute('mirror.creds.revoking', true)
      await this.gitlab.revokeProjectToken(group, currentToken.id).catch((err) => {
        this.logger.error(`Failed to revoke stale mirror token (projectSlug=${project.slug}, tokenId=${currentToken.id}): ${err}`)
        span?.setAttribute('mirror.creds.revoke.failed', true)
      })
    }
    return this.createMirrorAccessToken(project)
  }

  private async getMirrorTokenFromVault(project: ProjectWithDetails): Promise<MirrorUserSecret | undefined> {
    const vaultSecret = await this.vault.readTechnReadOnlyCreds(project.slug)
    const vaultToken = vaultSecret?.data?.MIRROR_TOKEN
    if (vaultToken) {
      const isValid = await this.gitlab.validateProjectToken(vaultToken)
      if (isValid) {
        return vaultSecret.data
      }
    }
  }

  @StartActiveSpan()
  private async createMirrorAccessToken(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('mirror.creds.rotated', true)
    const token = await this.gitlab.createMirrorAccessToken(project.slug)
    const creds = {
      MIRROR_USER: token.name,
      MIRROR_TOKEN: token.token,
    }
    await this.vault.writeTechReadOnlyCreds(project.slug, creds)
    span?.setAttribute('vault.secret.written', true)
    return creds
  }

  private getExternalRepoHost(externalRepoUrl: string | null | undefined): string | undefined {
    if (!externalRepoUrl) return undefined
    try {
      return new URL(externalRepoUrl).host
    } catch {
      return undefined
    }
  }
}
