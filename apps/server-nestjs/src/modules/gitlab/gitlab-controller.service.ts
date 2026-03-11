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
import { INFRA_APPS_REPO_NAME } from './gitlab.constant'
import { daysAgoFromNow, generateAccessLevelMapping, generateUsername, getAll, getPluginConfig } from './gitlab.utils'
import type { VaultSecret } from '../vault/vault-client.service'
import { specificallyEnabled } from '@cpn-console/hooks'
import { trace } from '@opentelemetry/api'

const ownedUserRegex = /group_\d+_bot/u
const tracer = trace.getTracer('gitlab-controller')

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
  async handleUpsert(project: ProjectWithDetails) {
    return tracer.startActiveSpan('handleUpsert', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        this.logger.log(`Handling project upsert for ${project.slug}`)
        await this.ensureProjectGroup(project)
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  @OnEvent('project.delete')
  async handleDelete(project: ProjectWithDetails) {
    return tracer.startActiveSpan('handleDelete', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        this.logger.log(`Handling project delete for ${project.slug}`)
        await this.ensureProjectGroup(project)
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    return tracer.startActiveSpan('handleCron', async (span) => {
      try {
        this.logger.log('Starting Gitlab reconciliation')
        const projects = await this.gitlabDatastore.getAllProjects()
        span.setAttribute('projects.count', projects.length)
        await this.ensureProjectGroups(projects)
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async ensureProjectGroups(projects: ProjectWithDetails[]) {
    tracer.startActiveSpan('ensureProjectGroups', async (span) => {
      try {
        span.setAttribute('projects.count', projects.length)
        await Promise.all(projects.map(p => this.ensureProjectGroup(p)))
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        throw error
      }
    })
  }

  private async ensureProjectGroup(project: ProjectWithDetails) {
    return tracer.startActiveSpan('ensureProject', async (span) => {
      try {
        const group = await this.gitlab.getOrCreateProjectSubGroup(project.slug)
        const members = await this.gitlab.getGroupMembers(group.id)
        span.setAttribute('project.slug', project.slug)
        await this.ensureProjectGroupMembers(project, group.id, members)
        await this.ensureProjectRepos(project)
        await this.ensureSystemRepos(project)
        span.end()
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        span.end()
        this.logger.error(`Failed to reconcile project ${project.slug}: ${error}`)
        throw error
      }
    })
  }

  private async ensureProjectGroupMembers(
    project: ProjectWithDetails,
    groupId: number,
    members: MemberSchema[],
  ) {
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
    const gitlabUser = await this.gitlab.getUserByEmail(user.email)
    if (!gitlabUser) {
      return this.gitlab.createUser(user.email, generateUsername(user.email), `${user.firstName} ${user.lastName}`)
    }
    return gitlabUser
  }

  private async ensureGroupMemberAccessLevel(
    groupId: number,
    gitlabUserId: number,
    accessLevel: number,
    membersById: Map<number, MemberSchema>,
  ) {
    const existingMember = membersById.get(gitlabUserId)

    if (!existingMember) {
      if (accessLevel === AccessLevel.NO_ACCESS) {
        await this.gitlab.editGroupMember(groupId, gitlabUserId, AccessLevel.NO_ACCESS)
      } else {
        await this.gitlab.addGroupMember(groupId, gitlabUserId, accessLevel)
      }
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

  private async purgeOrphanMembers(
    project: ProjectWithDetails,
    groupId: number,
    members: MemberSchema[],
  ) {
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

    if (specificallyEnabled(purgeConfig)) {
      await Promise.all(orphans.map(async (orphan) => {
        await this.gitlab.removeGroupMember(groupId, orphan.id)
        this.logger.log(`Removed ${orphan.username} from gitlab group ${groupId}`)
      }))
    } else {
      for (const orphan of orphans) {
        this.logger.warn(`User ${orphan.username} is in Gitlab group but not in project (purge disabled)`)
      }
    }
  }

  private isOwnedUser(member: MemberSchema) {
    return ownedUserRegex.test(member.username)
  }

  private async ensureProjectRepos(project: ProjectWithDetails) {
    const gitlabRepositories = await getAll(this.gitlab.getRepos(project.slug))
    for (const repo of project.repositories) {
      await this.ensureRepository(project, repo, gitlabRepositories)

      if (repo.externalRepoUrl) {
        await this.configureRepositoryMirroring(project, repo)
      } else {
        await this.cleanupMirrorSecrets(project, repo)
      }
    }
  }

  private async ensureRepository(project: ProjectWithDetails, repo: ProjectWithDetails['repositories'][number], gitlabRepositories: ProjectSchema[]) {
    let gitlabRepo = gitlabRepositories.find(r => r.name === repo.internalRepoName)
    if (!gitlabRepo) {
      gitlabRepo = await this.gitlab.upsertProjectGroupRepo(
        project.slug,
        repo.internalRepoName,
        undefined,
      )
    }
    return gitlabRepo
  }

  private async configureRepositoryMirroring(
    project: ProjectWithDetails,
    repo: ProjectWithDetails['repositories'][number],
  ) {
    const currentVaultSecret = await this.readGitlabMirrorCreds(project.slug, repo.internalRepoName)

    const internalRepoUrl = await this.gitlab.getProjectGroupInternalRepoUrl(project.slug, repo.internalRepoName)
    const externalRepoUrn = repo.externalRepoUrl.split('://')[1]
    const internalRepoUrn = internalRepoUrl.split('://')[1]

    const projectMirrorCreds = await this.getOrRotateProjectMirrorCreds(project.slug)

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
    await this.writeGitlabMirrorCreds(project.slug, repo.internalRepoName, mirrorSecretData)
  }

  // If no external URL, destroy secret if exists
  private async cleanupMirrorSecrets(project: ProjectWithDetails, repo: ProjectWithDetails['repositories'][number]) {
    await this.deleteGitlabMirrorCreds(project.slug, repo.internalRepoName)
  }

  private async readGitlabMirrorCreds(projectSlug: string, repoName: string) {
    const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
    return this.vault.read(vaultCredsPath)
  }

  private async writeGitlabMirrorCreds(projectSlug: string, repoName: string, data: Record<string, any>) {
    const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
    return this.vault.write(data, vaultCredsPath)
  }

  private async deleteGitlabMirrorCreds(projectSlug: string, repoName: string) {
    const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
    return this.vault.destroy(vaultCredsPath)
  }

  private async readProjectMirrorCreds(projectSlug: string) {
    const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
    return this.vault.read(vaultPath)
  }

  private async writeProjectMirrorCreds(projectSlug: string, creds: Record<string, any>) {
    const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
    return this.vault.write(creds, vaultPath)
  }

  private async saveMirrorTriggerToken(secret: Record<string, any>) {
    return this.vault.write(secret, 'GITLAB')
  }

  private async ensureSystemRepos(project: ProjectWithDetails) {
    await Promise.all([
      this.ensureInfraAppsRepo(project.slug),
      this.ensureMirrorRepo(project.slug),
    ])
  }

  private async ensureInfraAppsRepo(projectSlug: string) {
    await this.gitlab.upsertProjectGroupRepo(projectSlug, INFRA_APPS_REPO_NAME, undefined)
  }

  private async ensureMirrorRepo(projectSlug: string) {
    const mirrorRepo = await this.gitlab.upsertProjectMirrorRepo(projectSlug)
    if (mirrorRepo.empty_repo) {
      await this.gitlab.commitMirror(mirrorRepo.id)
    }
    await this.ensureMirrorRepoTriggerToken(projectSlug)
  }

  private async ensureMirrorRepoTriggerToken(projectSlug: string) {
    const triggerToken = await this.gitlab.getOrCreateMirrorPipelineTriggerToken(projectSlug)
    const gitlabSecret = {
      PROJECT_SLUG: projectSlug,
      GIT_MIRROR_PROJECT_ID: triggerToken.repoId,
      GIT_MIRROR_TOKEN: triggerToken.token,
    }
    await this.saveMirrorTriggerToken(gitlabSecret)
  }

  private async getOrRotateProjectMirrorCreds(projectSlug: string) {
    const vaultSecret = await this.readProjectMirrorCreds(projectSlug)
    if (vaultSecret && !this.isProjectMirrorCredsExpiring(vaultSecret)) {
      return vaultSecret.data as { MIRROR_USER: string, MIRROR_TOKEN: string }
    }
    return this.createProjectMirrorAccessToken(projectSlug)
  }

  private async createProjectMirrorAccessToken(projectSlug: string) {
    const token = await this.gitlab.createProjectMirrorAccessToken(projectSlug)
    const creds = {
      MIRROR_USER: token.name,
      MIRROR_TOKEN: token.token,
    }
    await this.writeProjectMirrorCreds(projectSlug, creds)
    return creds
  }

  private isProjectMirrorCredsExpiring(vaultSecret: VaultSecret): boolean {
    if (!vaultSecret?.metadata?.created_time) return false
    const createdTime = new Date(vaultSecret.metadata.created_time)
    return daysAgoFromNow(createdTime) > this.config.gitlabMirrorTokenRotationThresholdDays
  }
}
