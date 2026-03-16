import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AccessLevel } from '@gitbeaker/core'
import type { MemberSchema, ProjectSchema } from '@gitbeaker/core'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import type { ProjectWithDetails } from './gitlab-datastore.service'
import { GitlabService } from './gitlab.service'
import { VaultService } from '../vault/vault.service'
import { INFRA_APPS_REPO_NAME } from './gitlab.constants'
import { daysAgoFromNow, generateAccessLevelMapping, generateUsername, getAll, getPluginConfig } from './gitlab.utils'
import type { VaultSecret } from '../vault/vault-client.service'
import { specificallyEnabled } from '@cpn-console/hooks'
import { trace } from '@opentelemetry/api'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'

const ownedUserRegex = /group_\d+_bot/u

@Injectable()
export class GitlabControllerService {
  private readonly logger = new Logger(GitlabControllerService.name)

  constructor(
    @Inject(GitlabDatastoreService) private readonly gitlabDatastore: GitlabDatastoreService,
    @Inject(GitlabService) private readonly gitlab: GitlabService,
    @Inject(VaultService) private readonly vault: VaultService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
    this.logger.log('GitlabControllerService initialized')
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project upsert for ${project.slug}`)
    await this.ensureProjectGroup(project)
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.ensureProjectGroup(project)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    trace.getActiveSpan()?.setAttribute('projects.count', 0)
    this.logger.log('Starting Gitlab reconciliation')
    const projects = await this.gitlabDatastore.getAllProjects()
    trace.getActiveSpan()?.setAttribute('projects.count', projects.length)
    await this.ensureProjectGroups(projects)
  }

  @StartActiveSpan()
  private async ensureProjectGroups(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('projects.count', projects.length)
    await Promise.all(projects.map(p => this.ensureProjectGroup(p)))
  }

  @StartActiveSpan()
  private async ensureProjectGroup(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    const group = await this.gitlab.getOrCreateProjectSubGroup(project.slug)
    const members = await this.gitlab.getGroupMembers(group.id)
    await this.ensureProjectGroupMembers(project, group.id, members)
    await this.ensureProjectRepos(project)
    await this.ensureSystemRepos(project)
  }

  @StartActiveSpan()
  private async ensureProjectGroupMembers(
    project: ProjectWithDetails,
    groupId: number,
    members: MemberSchema[],
  ) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    await this.addMissingMembers(project, groupId, members)
    await this.addMissingOwnerMember(project, groupId, members)
    await this.purgeOrphanMembers(project, groupId, members)
  }

  private async addMissingMembers(
    project: ProjectWithDetails,
    groupId: number,
    members: MemberSchema[],
  ) {
    const membersById = new Map(members.map(m => [m.id, m]))
    const accessLevelByUserId = generateAccessLevelMapping(project)

    await Promise.all(project.members.map(async ({ user }) => {
      const gitlabUser = await this.upsertUser(user)
      if (!gitlabUser) return
      const accessLevel = accessLevelByUserId.get(user.id) ?? AccessLevel.NO_ACCESS
      await this.ensureGroupMemberAccessLevel(groupId, gitlabUser.id, accessLevel, membersById)
    }))
  }

  private async upsertUser(user: ProjectWithDetails['members'][number]['user']) {
    return await this.gitlab.getUserByEmail(user.email)
      ?? await this.gitlab.createUser(
        user.email,
        generateUsername(user.email),
        `${user.firstName} ${user.lastName}`,
      )
  }

  private async ensureGroupMemberAccessLevel(
    groupId: number,
    gitlabUserId: number,
    accessLevel: AccessLevel,
    membersById: Map<number, MemberSchema>,
  ) {
    const existingMember = membersById.get(gitlabUserId)

    if (accessLevel === AccessLevel.NO_ACCESS) {
      if (existingMember) {
        await this.gitlab.removeGroupMember(groupId, gitlabUserId)
      }
      return
    }

    if (!existingMember) {
      await this.gitlab.addGroupMember(groupId, gitlabUserId, accessLevel)
      return
    }

    if (existingMember.access_level !== accessLevel) {
      await this.gitlab.editGroupMember(groupId, gitlabUserId, accessLevel)
    }
  }

  private async addMissingOwnerMember(
    project: ProjectWithDetails,
    groupId: number,
    members: MemberSchema[],
  ) {
    const gitlabUser = await this.upsertUser(project.owner)
    if (!gitlabUser) return
    const membersById = new Map(members.map(m => [m.id, m]))
    await this.ensureGroupMemberAccessLevel(groupId, gitlabUser.id, AccessLevel.OWNER, membersById)
  }

  @StartActiveSpan()
  private async purgeOrphanMembers(
    project: ProjectWithDetails,
    groupId: number,
    members: MemberSchema[],
  ) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'group.id': groupId,
      'members.total': members.length,
    })
    const purgeConfig = getPluginConfig(project, 'purge')
    const usernames = new Set([
      generateUsername(project.owner.email),
      ...project.members.map(m => generateUsername(m.user.email)),
    ])
    const emails = new Set([
      project.owner.email.toLowerCase(),
      ...project.members.map(m => m.user.email.toLowerCase()),
    ])

    const orphans = members.filter((member) => {
      if (this.isOwnedUser(member)) return false
      if (usernames.has(member.username)) return false
      if (member.email && emails.has(member.email.toLowerCase())) return false
      return true
    })
    span?.setAttribute('orphans.count', orphans.length)

    if (specificallyEnabled(purgeConfig)) {
      span?.setAttribute('purge.enabled', true)
      await Promise.all(orphans.map(async (orphan) => {
        span?.setAttribute('orphan.username', orphan.username)
        await this.gitlab.removeGroupMember(groupId, orphan.id)
        this.logger.log(`Removed ${orphan.username} from gitlab group ${groupId}`)
      }))
    } else {
      span?.setAttribute('purge.enabled', false)
      for (const orphan of orphans) {
        span?.setAttribute('orphan.username', orphan.username)
        this.logger.warn(`User ${orphan.username} is in Gitlab group but not in project (purge disabled)`)
      }
    }
  }

  private isOwnedUser(member: MemberSchema) {
    return ownedUserRegex.test(member.username)
  }

  @StartActiveSpan()
  private async ensureProjectRepos(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('repositories.count', project.repositories.length)
    const gitlabRepositories = await getAll(this.gitlab.getRepos(project.slug))
    span?.setAttribute('gitlab.repositories.count', gitlabRepositories.length)
    for (const repo of project.repositories) {
      span?.setAttribute('repository.internalRepoName', repo.internalRepoName)
      span?.setAttribute('repository.externalRepoUrl', repo.externalRepoUrl ?? '')
      await this.ensureRepository(project, repo, gitlabRepositories)

      if (repo.externalRepoUrl) {
        span?.setAttribute('repository.mirroring', true)
        await this.configureRepositoryMirroring(project, repo)
      } else {
        span?.setAttribute('repository.mirroring', false)
        await this.vault.deleteGitlabMirrorCreds(project.slug, repo.internalRepoName)
      }
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
    span?.setAttribute('repository.externalRepoUrl', repo.externalRepoUrl ?? '')
    span?.setAttribute('repository.isPrivate', repo.isPrivate)

    const currentVaultSecret = await this.vault.readGitlabMirrorCreds(project.slug, repo.internalRepoName)
    span?.setAttribute('vault.secret.exists', !!currentVaultSecret)
    if (!currentVaultSecret) {
      this.logger.warn('No existing mirror credentials found in Vault, rotating new ones', {
        projectSlug: project.slug,
        repoName: repo.internalRepoName,
      })
    }

    const internalRepoUrl = await this.gitlab.getProjectGroupInternalRepoUrl(project.slug, repo.internalRepoName)
    const externalRepoUrn = repo.externalRepoUrl.split('://')[1]
    const internalRepoUrn = internalRepoUrl.split('://')[1]
    span?.setAttribute('repository.externalRepoUrn', externalRepoUrn)
    span?.setAttribute('repository.internalRepoUrn', internalRepoUrn)

    const projectMirrorCreds = await this.getOrRotateMirrorCreds(project.slug)
    span?.setAttribute('mirrorCreds.user', projectMirrorCreds.MIRROR_USER)

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

    if (!this.isMirrorCredsExpiring(vaultSecret)) {
      return vaultSecret.data as { MIRROR_USER: string, MIRROR_TOKEN: string }
    }
    return this.createMirrorAccessToken(projectSlug)
  }

  @StartActiveSpan()
  private async createMirrorAccessToken(projectSlug: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
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
}
