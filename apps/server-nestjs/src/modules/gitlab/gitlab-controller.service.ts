import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AccessLevel, type MemberSchema, type ProjectSchema, type SimpleUserSchema } from '@gitbeaker/core'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import type { ProjectWithDetails } from './gitlab-datastore.service'
import { GitlabService } from './gitlab.service'
import { VaultService } from '../vault/vault.service'
import { INFRA_APPS_REPO_NAME } from './gitlab.constant'
import { daysAgoFromNow, getAll } from './gitlab.utils'
import type { VaultSecret } from '../vault/vault-client.service'

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
    this.logger.log(`Handling project upsert for ${project.slug}`)
    return this.reconcileProject(project)
  }

  @OnEvent('project.delete')
  async handleDelete(project: ProjectWithDetails) {
    this.logger.log(`Handling project delete for ${project.slug}`)
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting Gitlab reconciliation')
    const projects = await this.gitlabDatastore.getAllProjects()
    const results = await Promise.allSettled(projects.map(p => this.reconcileProject(p)))
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logger.error(`Reconciliation failed: ${result.reason}`)
      }
    })
  }

  private async reconcileProject(project: ProjectWithDetails) {
    try {
      await this.ensureMembers(project)
      await this.ensureRepos(project)
    } catch (error) {
      this.logger.error(`Failed to reconcile project ${project.slug}: ${error}`)
      throw error
    }
  }

  private async ensureMembers(project: ProjectWithDetails) {
    const group = await this.gitlab.getOrCreateProjectSubGroup(project.slug)
    const members = await this.gitlab.getGroupMembers(group.id)
    const projectUsers = project.members.map(m => m.user)

    const gitlabUsers = await Promise.all(projectUsers.map(async (user) => {
      let gitlabUser = await this.gitlab.getUserByEmail(user.email)
      const username = user.email.split('@')[0]

      if (!gitlabUser) {
        try {
          gitlabUser = await this.gitlab.createUser(user.email, username, `${user.firstName} ${user.lastName}`)
        } catch (e) {
          this.logger.warn(`Failed to create user ${user.email}: ${e}`)
          return null
        }
      }
      return gitlabUser
    }))

    const validGitlabUsers = gitlabUsers.filter(u => u !== null)

    await this.addMissingMembers(group.id, validGitlabUsers, members)
    await this.purgeOrphanMembers(group.id, validGitlabUsers, members)
  }

  private async addMissingMembers(groupId: number, validGitlabUserIds: SimpleUserSchema[], members: MemberSchema[]) {
    for (const user of validGitlabUserIds) {
      if (!members.find(m => m.id === user.id)) {
        await this.gitlab.addGroupMember(groupId, user.id, AccessLevel.DEVELOPER)
      }
    }
  }

  private async purgeOrphanMembers(groupId: number, validGitlabUserIds: SimpleUserSchema[], members: MemberSchema[]) {
    for (const member of members) {
      if (this.isManagedUser(member)) continue
      if (!validGitlabUserIds.find(u => u.id === member.id)) {
        if (this.config.gitlabControllerPurgeOrphanMembers) {
          await this.gitlab.removeGroupMember(groupId, member.id)
          this.logger.log(`Removed ${member.username} from gitlab group ${groupId}`)
        } else {
          this.logger.warn(`User ${member.username} is in Gitlab group but not in project (purge disabled)`)
        }
      }
    }
  }

  private isManagedUser(member: MemberSchema) {
    return member.username.match(/group_\d+_bot/)
  }

  private async ensureRepos(project: ProjectWithDetails) {
    const gitlabRepositories = await getAll(this.gitlab.getRepos(project.slug))
    await this.syncProjectRepos(project, gitlabRepositories)
    await this.ensureSystemRepos(project)
  }

  private async syncProjectRepos(project: ProjectWithDetails, gitlabRepositories: ProjectSchema[]) {
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
    const externalRepoUrn = repo.externalRepoUrl.split(/:\/\/(.*)/s)[1]
    const internalRepoUrn = internalRepoUrl.split(/:\/\/(.*)/s)[1]

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
