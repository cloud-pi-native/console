import type { CondensedGroupSchema, MemberSchema, ProjectSchema } from '@gitbeaker/core'
import type { VaultSecret } from '../vault/vault-client.service'
import type { ProjectWithDetails } from './gitlab-datastore.service'
import { specificallyEnabled } from '@cpn-console/hooks'
import { AccessLevel } from '@gitbeaker/core'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { getAll } from '../../utils/iterable'
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
  INFRA_APPS_REPO_NAME,
  PROJECT_DEVELOPER_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PROJECT_MAINTAINER_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PROJECT_REPORTER_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PURGE_PLUGIN_KEY,
  TOPIC_PLUGIN_MANAGED,
} from './gitlab.constants'
import { generateUsernameCandidates } from './gitlab.utils'

const ownedUserRegex = /group_\d+_bot/u

@Injectable()
export class GitlabService {
  private readonly logger = new Logger(GitlabService.name)

  constructor(
    @Inject(GitlabDatastoreService) private readonly gitlabDatastore: GitlabDatastoreService,
    @Inject(GitlabClientService) private readonly gitlab: GitlabClientService,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
    this.logger.log('GitLabService initialized')
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project upsert event for ${project.slug}`)
    await this.ensureProjectGroup(project)
    this.logger.log(`GitLab sync completed for project ${project.slug}`)
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project delete event for ${project.slug}`)
    await this.ensureProjectGroup(project)
    this.logger.log(`GitLab sync completed for project ${project.slug}`)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    const span = trace.getActiveSpan()
    span?.setAttribute('gitlab.projects.count', 0)
    this.logger.log('Starting GitLab reconciliation')
    const projects = await this.gitlabDatastore.getAllProjects()
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
    this.logger.verbose(`GitLab project group reconciled (${project.slug})`)
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
      const isAdmin = adminRoleId ? user.adminRoleIds?.includes(adminRoleId) : undefined
      const isAuditor = auditorRoleId ? user.adminRoleIds?.includes(auditorRoleId) : undefined
      const gitlabUser = await this.gitlab.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin,
        isAuditor,
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
    accessLevel: Exclude<AccessLevel, AccessLevel.ADMIN>,
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
    const isAdmin = adminRoleId ? project.owner.adminRoleIds?.includes(adminRoleId) : undefined
    const isAuditor = auditorRoleId ? project.owner.adminRoleIds?.includes(auditorRoleId) : undefined
    const gitlabUser = await this.gitlab.upsertUser({
      id: project.owner.id,
      email: project.owner.email,
      firstName: project.owner.firstName,
      lastName: project.owner.lastName,
      isAdmin,
      isAuditor,
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
    const roles = await this.gitlabDatastore.getAdminRolesByOidcGroups([adminGroupPath, auditorGroupPath])
    return generateAdminRoleMapping(roles, adminGroupPath, auditorGroupPath)
  }

  private async getAdminGroupPath(project: ProjectWithDetails): Promise<string> {
    return await this.getAdminOrProjectPluginConfig(project, ADMIN_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_ADMIN_GROUP_PATH
  }

  private async getAuditorGroupPath(project: ProjectWithDetails): Promise<string> {
    return await this.getAdminOrProjectPluginConfig(project, AUDITOR_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_AUDITOR_GROUP_PATH
  }

  private async getAdminOrProjectPluginConfig(project: ProjectWithDetails, key: string): Promise<string | undefined> {
    const adminPluginConfig = await this.gitlabDatastore.getAdminPluginConfig('gitlab', key)
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
    const gitlabRepositories = await getAll(this.gitlab.getRepos(project.slug))
    span?.setAttribute('gitlab.repositories.count', gitlabRepositories.length)
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
      await this.ensureRepository(project, repo, gitlabRepositories)

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

  private async ensureRepository(
    project: ProjectWithDetails,
    repo: ProjectWithDetails['repositories'][number],
    gitlabRepositories: ProjectSchema[],
  ) {
    return gitlabRepositories.find(r => r.name === repo.internalRepoName)
      ?? await this.gitlab.upsertProjectGroupRepo(
        project.slug,
        repo.internalRepoName,
      )
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

    const projectMirrorCreds = await this.getOrRotateMirrorCreds(project.slug)

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
      this.ensureInfraAppsRepo(project.slug),
      this.ensureMirrorRepo(project.slug),
    ])
  }

  private async ensureInfraAppsRepo(projectSlug: string) {
    await this.gitlab.upsertProjectGroupRepo(projectSlug, INFRA_APPS_REPO_NAME)
  }

  private async ensureMirrorRepo(projectSlug: string) {
    const mirrorRepo = await this.gitlab.upsertProjectMirrorRepo(projectSlug)
    if (mirrorRepo.empty_repo) {
      await this.gitlab.commitMirror(mirrorRepo.id)
    }
    await this.ensureMirrorRepoTriggerToken(projectSlug)
  }

  @StartActiveSpan()
  private async ensureMirrorRepoTriggerToken(projectSlug: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    const triggerToken = await this.gitlab.getOrCreateMirrorPipelineTriggerToken(projectSlug)
    const gitlabSecret = {
      PROJECT_SLUG: projectSlug,
      GIT_MIRROR_PROJECT_ID: triggerToken.repoId,
      GIT_MIRROR_TOKEN: triggerToken.token,
    }
    await this.vault.writeMirrorTriggerToken(gitlabSecret)
    span?.setAttribute('vault.secret.written', true)
  }

  @StartActiveSpan()
  private async getOrRotateMirrorCreds(projectSlug: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    const vaultSecret = await this.vault.readTechnReadOnlyCreds(projectSlug)
    if (!vaultSecret) return this.createMirrorAccessToken(projectSlug)

    const isExpiring = this.isMirrorCredsExpiring(vaultSecret)
    span?.setAttribute('mirror.creds.expiring', isExpiring)
    if (!isExpiring) {
      span?.setAttribute('mirror.creds.rotated', false)
      return vaultSecret.data as { MIRROR_USER: string, MIRROR_TOKEN: string }
    }
    return this.createMirrorAccessToken(projectSlug)
  }

  @StartActiveSpan()
  private async createMirrorAccessToken(projectSlug: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('mirror.creds.rotated', true)
    const token = await this.gitlab.createMirrorAccessToken(projectSlug)
    const creds = {
      MIRROR_USER: token.name,
      MIRROR_TOKEN: token.token,
    }
    await this.vault.writeTechReadOnlyCreds(projectSlug, creds)
    span?.setAttribute('vault.secret.written', true)
    return creds
  }

  private isMirrorCredsExpiring(vaultSecret: VaultSecret): boolean {
    if (!vaultSecret?.metadata?.created_time) return false
    const createdTime = new Date(vaultSecret.metadata.created_time)
    return daysAgoFromNow(createdTime) > this.config.gitlabMirrorTokenRotationThresholdDays
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

function isOwnedUser(member: MemberSchema) {
  return ownedUserRegex.test(member.username)
}

function isOwnedRepo(repo: ProjectSchema) {
  return repo.topics?.includes(TOPIC_PLUGIN_MANAGED) ?? false
}

function isSystemRepo(project: ProjectWithDetails, repo: ProjectSchema) {
  return project.repositories.some(r => r.internalRepoName === repo.name)
}

function getProjectPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}

function generateProjectRoleGroupPath(projectSlug: string, rawGroupPathSuffixes: string) {
  return rawGroupPathSuffixes
    .split(',')
    .map(path => path.trim())
    .filter(Boolean)
    .map(path => `/${projectSlug}${path}`)
}

function generateAdminRoleMapping(
  roles: ProjectWithDetails['roles'],
  adminGroupPath: string,
  auditorGroupPath: string,
) {
  const roleIdByOidcGroup = new Map(roles.map(r => [r.oidcGroup, r.id] as const))
  return {
    adminRoleId: roleIdByOidcGroup.get(adminGroupPath),
    auditorRoleId: roleIdByOidcGroup.get(auditorGroupPath),
  }
}

function generateAccessLevelMapping(
  project: ProjectWithDetails,
  groupPaths: { reporter: string[], developer: string[], maintainer: string[] },
): Map<string, Exclude<AccessLevel, AccessLevel.ADMIN>> {
  const getAccessLevelFromOidcGroup = (oidcGroup: string | null): Exclude<AccessLevel, AccessLevel.ADMIN> | null => {
    if (!oidcGroup) return null
    if (groupPaths.reporter.includes(oidcGroup)) return AccessLevel.REPORTER
    if (groupPaths.developer.includes(oidcGroup)) return AccessLevel.DEVELOPER
    if (groupPaths.maintainer.includes(oidcGroup)) return AccessLevel.MAINTAINER
    return null
  }

  const roleAccessLevelById = new Map(
    project.roles.map(role => [role.id, getAccessLevelFromOidcGroup(role.oidcGroup)]),
  )

  return new Map(project.members.map((membership) => {
    let highest: Exclude<AccessLevel, AccessLevel.ADMIN> | null = null
    for (const roleId of membership.roleIds) {
      const level = roleAccessLevelById.get(roleId)
      if (level !== null && level !== undefined && (highest === null || level > highest)) highest = level
    }
    return [membership.user.id, highest ?? AccessLevel.GUEST] as const
  }))
}

function daysAgoFromNow(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}
