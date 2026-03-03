import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AccessLevel, type MemberSchema, type ProjectSchema, type SimpleUserSchema } from '@gitbeaker/core'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import type { ProjectWithDetails } from './gitlab-datastore.service'
import { GitlabService } from './gitlab.service'
import { VaultService } from '../vault/vault.service'
import { INFRA_APPS_REPO_NAME, INTERNAL_MIRROR_REPO_NAME } from './gitlab.constant'
import { getAll } from './gitlab.utils'

@Injectable()
export class GitlabControllerService {
  private readonly logger = new Logger(GitlabControllerService.name)

  constructor(
    @Inject(GitlabDatastoreService) private readonly gitlabDatastore: GitlabDatastoreService,
    @Inject(GitlabService) private readonly gitlabService: GitlabService,
    @Inject(VaultService) private readonly vaultService: VaultService,
    @Inject(ConfigurationService) private readonly configService: ConfigurationService,
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
    const group = await this.gitlabService.getProjectGroup(project.slug)
    if (group) {
      await this.gitlabService.deleteGroup(group.id)
    }
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
      await this.ensureRepositories(project)
    } catch (error) {
      this.logger.error(`Failed to reconcile project ${project.slug}: ${error}`)
      throw error
    }
  }

  private async ensureMembers(project: ProjectWithDetails) {
    const group = await this.gitlabService.getOrCreateProjectSubGroup(project.slug)
    const members = await this.gitlabService.getGroupMembers(group.id)
    const projectUsers = project.members.map(m => m.user)

    const gitlabUsers = await Promise.all(projectUsers.map(async (user) => {
      let gitlabUser = await this.gitlabService.getUserByEmail(user.email)
      const username = user.email.split('@')[0]

      if (!gitlabUser) {
        try {
          gitlabUser = await this.gitlabService.createUser(user.email, username, `${user.firstName} ${user.lastName}`)
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
        await this.gitlabService.addGroupMember(groupId, user.id, AccessLevel.DEVELOPER)
      }
    }
  }

  private async purgeOrphanMembers(groupId: number, validGitlabUserIds: SimpleUserSchema[], members: MemberSchema[]) {
    for (const member of members) {
      if (this.isManagedUser(member)) continue
      if (!validGitlabUserIds.find(u => u.id === member.id)) {
        await this.gitlabService.removeGroupMember(groupId, member.id)
      }
    }
  }

  private isManagedUser(member: MemberSchema) {
    return member.username.match(/group_\d+_bot/)
  }

  private async ensureRepositories(project: ProjectWithDetails) {
    const gitlabRepositories = await getAll(this.gitlabService.getRepositories(project.slug))
    const projectMirrorCreds = await this.getProjectMirrorCreds(project.slug)
    await this.syncProjectRepositories(project, gitlabRepositories, projectMirrorCreds)
    await this.ensureSpecialRepositories(project, gitlabRepositories)
  }

  private async syncProjectRepositories(project: ProjectWithDetails, gitlabRepositories: ProjectSchema[], projectMirrorCreds: { MIRROR_USER: string, MIRROR_TOKEN: string }) {
    for (const repo of project.repositories) {
      await this.ensureRepository(project, repo, gitlabRepositories)

      if (repo.externalRepoUrl) {
        await this.configureRepositoryMirroring(project, repo, projectMirrorCreds)
      } else {
        await this.cleanupMirrorSecrets(project, repo)
      }
    }
  }

  private async ensureRepository(project: ProjectWithDetails, repo: any, gitlabRepositories: ProjectSchema[]) {
    let gitlabRepo = gitlabRepositories.find(r => r.name === repo.internalRepoName)
    if (!gitlabRepo) {
      gitlabRepo = await this.gitlabService.createEmptyProjectRepository(
        project.slug,
        repo.internalRepoName,
        undefined,
        !!repo.externalRepoUrl,
      )
    }
    return gitlabRepo
  }

  private async configureRepositoryMirroring(
    project: ProjectWithDetails,
    repo: any,
    projectMirrorCreds: { MIRROR_USER: string, MIRROR_TOKEN: string },
  ) {
    const vaultCredsPath = `${this.configService.projectRootPath}/${project.slug}/${repo.internalRepoName}-mirror`
    const currentVaultSecret = await this.vaultService.read(vaultCredsPath)

    const internalRepoUrl = await this.gitlabService.getInternalRepoUrl(project.slug, repo.internalRepoName)
    const externalRepoUrn = repo.externalRepoUrl.split(/:\/\/(.*)/s)[1]
    const internalRepoUrn = internalRepoUrl.split(/:\/\/(.*)/s)[1]

    const mirrorSecretData = {
      GIT_INPUT_URL: externalRepoUrn,
      GIT_INPUT_USER: repo.isPrivate ? repo.externalUserName : undefined,
      GIT_INPUT_PASSWORD: currentVaultSecret?.GIT_INPUT_PASSWORD, // Preserve existing password as it's not in DB
      GIT_OUTPUT_URL: internalRepoUrn,
      GIT_OUTPUT_USER: projectMirrorCreds.MIRROR_USER,
      GIT_OUTPUT_PASSWORD: projectMirrorCreds.MIRROR_TOKEN,
    }

    // Write to vault if changed
    // Using simplified check
    await this.vaultService.write(mirrorSecretData, vaultCredsPath)
  }

  private async cleanupMirrorSecrets(project: ProjectWithDetails, repo: any) {
    // If no external URL, destroy secret if exists
    const vaultCredsPath = `${this.configService.projectRootPath}/${project.slug}/${repo.internalRepoName}-mirror`
    await this.vaultService.destroy(vaultCredsPath)
  }

  private async ensureSpecialRepositories(project: ProjectWithDetails, gitlabRepositories: ProjectSchema[]) {
    // Ensure special repos
    if (!gitlabRepositories.find(r => r.name === INFRA_APPS_REPO_NAME)) {
      await this.gitlabService.createEmptyProjectRepository(project.slug, INFRA_APPS_REPO_NAME, undefined, false)
    }

    const mirrorRepo = gitlabRepositories.find(r => r.name === INTERNAL_MIRROR_REPO_NAME)
    if (!mirrorRepo) {
      const newMirrorRepo = await this.gitlabService.createEmptyProjectRepository(project.slug, INTERNAL_MIRROR_REPO_NAME, undefined, false)
      await this.gitlabService.commitMirror(newMirrorRepo.id)
    }

    // Setup Trigger Token for mirror repo
    const triggerToken = await this.gitlabService.getMirrorProjectTriggerToken(project.slug)
    const gitlabSecret = {
      PROJECT_SLUG: project.slug,
      GIT_MIRROR_PROJECT_ID: triggerToken.repoId,
      GIT_MIRROR_TOKEN: triggerToken.token,
    }
    await this.vaultService.write(gitlabSecret, 'GITLAB')
  }

  private async getProjectMirrorCreds(projectSlug: string) {
    const tokenName = `${projectSlug}-bot`
    const currentToken = await this.gitlabService.getProjectToken(projectSlug, tokenName)
    const vaultPath = `${this.configService.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`

    if (currentToken) {
      const vaultSecret = await this.vaultService.read(vaultPath)
      // Verify if token works? Plugin does.
      // For simplicity, return from vault if exists.
      if (vaultSecret) return vaultSecret as unknown as { MIRROR_USER: string, MIRROR_TOKEN: string }
    }

    const newToken = await this.gitlabService.createProjectToken(projectSlug, tokenName, ['write_repository', 'read_repository', 'read_api'])
    const creds = {
      MIRROR_USER: newToken.name,
      MIRROR_TOKEN: newToken.token,
    }
    await this.vaultService.write(creds, vaultPath)
    return creds
  }
}
