import type { NexusPrivilege } from './nexus-client.service'
import type { ProjectWithDetails } from './nexus-datastore.service'
import type {
  MavenHostedRepoKind,
} from './nexus.utils'
import { specificallyEnabled } from '@cpn-console/hooks'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultError } from '../vault/vault-http-client.service.js'
import { NexusClientService } from './nexus-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import {
  DEFAULT_MAVEN_RELEASE_WRITE_POLICY,
  DEFAULT_MAVEN_SNAPSHOT_WRITE_POLICY,
  DEFAULT_NPM_WRITE_POLICY,
  NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO,
  NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO,
  NEXUS_CONFIG_KEY_MAVEN_RELEASE_WRITE_POLICY,
  NEXUS_CONFIG_KEY_MAVEN_SNAPSHOT_WRITE_POLICY,
  NEXUS_CONFIG_KEY_NPM_WRITE_POLICY,
} from './nexus.constants'
import {
  generateMavenHostedRepoName,
  generateNpmHostedRepoName,
  generateRandomPassword,
  getPluginConfig,
  getProjectVaultPath,
} from './nexus.utils'

export interface EnsureMavenReposOptions {
  snapshotWritePolicy: string
  releaseWritePolicy: string
}

@Injectable()
export class NexusService {
  private readonly logger = new Logger(NexusService.name)

  constructor(
    @Inject(NexusDatastoreService) private readonly nexusDatastore: NexusDatastoreService,
    @Inject(NexusClientService) private readonly client: NexusClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
  ) {
    this.logger.log('NexusService initialized')
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project upsert for ${project.slug}`)
    await this.ensureProject(project)
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.deleteProject(project.slug)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    const span = trace.getActiveSpan()
    this.logger.log('Starting Nexus reconciliation')
    const projects = await this.nexusDatastore.getAllProjects()
    span?.setAttribute('nexus.projects.count', projects.length)
    await this.ensureProjects(projects)
  }

  @StartActiveSpan()
  private async ensureProjects(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('nexus.projects.count', projects.length)
    await Promise.all(projects.map(p => this.ensureProject(p)))
  }

  @StartActiveSpan()
  private async ensureProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    const projectSlug = project.slug
    span?.setAttribute('project.slug', projectSlug)

    const ownerEmail = project.owner.email
    const enableMaven = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO)) ?? false
    const enableNpm = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO)) ?? false

    const mavenSnapshotWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEY_MAVEN_SNAPSHOT_WRITE_POLICY) ?? DEFAULT_MAVEN_SNAPSHOT_WRITE_POLICY
    const mavenReleaseWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEY_MAVEN_RELEASE_WRITE_POLICY) ?? DEFAULT_MAVEN_RELEASE_WRITE_POLICY
    const npmWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEY_NPM_WRITE_POLICY) ?? DEFAULT_NPM_WRITE_POLICY

    await Promise.all([
      enableMaven
        ? this.ensureMavenRepos(projectSlug, { snapshotWritePolicy: mavenSnapshotWritePolicy, releaseWritePolicy: mavenReleaseWritePolicy })
        : this.deleteMavenRepos(projectSlug),
      enableNpm
        ? this.ensureNpmRepos(projectSlug, npmWritePolicy)
        : this.deleteNpmRepos(projectSlug),
    ])

    const privileges = [
      ...(enableMaven
        ? [
            generateMavenGroupPrivilegeName(projectSlug),
            generateMavenHostedPrivilegeName(projectSlug, 'release'),
            generateMavenHostedPrivilegeName(projectSlug, 'snapshot'),
          ]
        : []),
      ...(enableNpm
        ? [
            generateNpmGroupPrivilegeName(projectSlug),
            generateNpmHostedPrivilegeName(projectSlug),
          ]
        : []),
    ]
    await this.ensureRole(projectSlug, privileges)

    const vaultPath = getProjectVaultPath(this.config.projectRootDir, projectSlug, 'tech/NEXUS')
    let existingPassword: string | undefined
    try {
      const secret = await this.vault.read(vaultPath)
      existingPassword = secret.data?.NEXUS_PASSWORD
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') {
        existingPassword = undefined
      } else {
        throw error
      }
    }

    const password = await this.ensureUser(projectSlug, ownerEmail, existingPassword)
    await this.vault.write({
      NEXUS_PASSWORD: password,
      NEXUS_USERNAME: projectSlug,
    }, vaultPath)
  }

  private async upsertPrivilege(body: NexusPrivilege) {
    const existing = await this.client.getSecurityPrivileges(body.name)
    if (!existing) {
      await this.client.createSecurityPrivilegesRepositoryView(body)
      return
    }
    await this.client.updateSecurityPrivilegesRepositoryView(body.name, body)
  }

  private async ensureMavenHostedRepo(repoName: string, writePolicy: string) {
    const existing = await this.client.getRepositoriesMavenHosted(repoName)
    const body = {
      name: repoName,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
        writePolicy,
      },
      cleanup: { policyNames: ['string'] },
      component: { proprietaryComponents: true },
      maven: {
        versionPolicy: 'MIXED',
        layoutPolicy: 'STRICT',
        contentDisposition: 'ATTACHMENT',
      },
    }
    if (!existing) {
      await this.client.createRepositoriesMavenHosted(body)
      return
    }
    await this.client.updateRepositoriesMavenHosted(repoName, body)
  }

  private async ensureNpmHostedRepo(repoName: string, writePolicy: string) {
    const existing = await this.client.getRepositoriesNpmHosted(repoName)
    const body = {
      name: repoName,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
        writePolicy,
      },
      cleanup: { policyNames: ['string'] },
      component: { proprietaryComponents: true },
    }
    if (!existing) {
      await this.client.createRepositoriesNpmHosted(body)
      return
    }
    await this.client.updateRepositoriesNpmHosted(repoName, body)
  }

  private async ensureNpmGroupRepo(repoName: string, memberNames: string[]) {
    const existing = await this.client.getRepositoriesNpmGroup(repoName)
    const body = {
      name: repoName,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
      },
      group: {
        memberNames,
      },
    }
    if (!existing) {
      await this.client.postRepositoriesNpmGroup(body)
      return
    }
    await this.client.putRepositoriesNpmGroup(repoName, body)
  }

  private async ensureMavenHostedRepos(args: {
    releaseRepoName: string
    snapshotRepoName: string
    releaseWritePolicy: string
    snapshotWritePolicy: string
  }) {
    await Promise.all([
      this.ensureMavenHostedRepo(args.snapshotRepoName, args.snapshotWritePolicy),
      this.ensureMavenHostedRepo(args.releaseRepoName, args.releaseWritePolicy),
    ])
  }

  private async ensureMavenRepos(projectSlug: string, options: EnsureMavenReposOptions) {
    const releaseRepoName = generateMavenHostedRepoName(projectSlug, 'release')
    const snapshotRepoName = generateMavenHostedRepoName(projectSlug, 'snapshot')
    const groupRepoName = generateMavenGroupRepoName(projectSlug)

    const releasePrivilege = generateMavenHostedPrivilegeName(projectSlug, 'release')
    const snapshotPrivilege = generateMavenHostedPrivilegeName(projectSlug, 'snapshot')
    const groupPrivilege = generateMavenGroupPrivilegeName(projectSlug)

    await this.ensureMavenHostedRepos({
      releaseRepoName,
      snapshotRepoName,
      releaseWritePolicy: options.releaseWritePolicy,
      snapshotWritePolicy: options.snapshotWritePolicy,
    })

    await this.ensureMavenGroupRepo(
      groupRepoName,
      [releaseRepoName, snapshotRepoName, 'maven-public'],
    )

    const privilegesToEnsure = [
      { repo: releaseRepoName, privilege: releasePrivilege },
      { repo: snapshotRepoName, privilege: snapshotPrivilege },
      { repo: groupRepoName, privilege: groupPrivilege },
    ]
    await this.ensureMavenPrivileges(projectSlug, privilegesToEnsure)
  }

  private async ensureMavenGroupRepo(repoName: string, memberNames: string[]) {
    const existing = await this.client.getRepositoriesMavenGroup(repoName)
    const body = {
      name: repoName,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
      },
      group: {
        memberNames,
      },
    }
    if (!existing) {
      await this.client.createRepositoriesMavenGroup(body)
      return
    }
    await this.client.updateRepositoriesMavenGroup(repoName, body)
  }

  private async ensureMavenPrivileges(projectSlug: string, entries: Array<{ repo: string, privilege: string }>) {
    for (const entry of entries) {
      await this.upsertPrivilege({
        type: 'maven',
        name: entry.privilege,
        description: `Privilege for organization ${projectSlug} for repo ${entry.repo}`,
        actions: ['all'],
        format: 'maven2',
        repository: entry.repo,
      })
    }
  }

  private async deleteMavenRepos(projectSlug: string) {
    const repoPaths = [
      generateMavenGroupRepoName(projectSlug),
      generateMavenHostedRepoName(projectSlug, 'release'),
      generateMavenHostedRepoName(projectSlug, 'snapshot'),
    ]
    const privileges = [
      generateMavenGroupPrivilegeName(projectSlug),
      generateMavenHostedPrivilegeName(projectSlug, 'release'),
      generateMavenHostedPrivilegeName(projectSlug, 'snapshot'),
    ]
    await Promise.all(privileges.map(privilege => this.client.deleteSecurityPrivileges(privilege)))
    await Promise.all(repoPaths.map(repo => this.client.deleteRepositoriesByName(repo)))
  }

  private async ensureNpmRepos(projectSlug: string, writePolicy: string) {
    const hostedRepoName = generateNpmHostedRepoName(projectSlug)
    const groupRepoName = generateNpmGroupRepoName(projectSlug)

    const hostedPrivilege = generateNpmHostedPrivilegeName(projectSlug)
    const groupPrivilege = generateNpmGroupPrivilegeName(projectSlug)

    await this.ensureNpmHostedRepo(hostedRepoName, writePolicy)
    await this.ensureNpmGroupRepo(groupRepoName, [hostedRepoName])

    for (const name of [
      { repo: hostedRepoName, privilege: hostedPrivilege },
      { repo: groupRepoName, privilege: groupPrivilege },
    ]) {
      await this.upsertPrivilege({
        type: 'npm',
        name: name.privilege,
        description: `Privilege for organization ${projectSlug} for repo ${name.repo}`,
        actions: ['all'],
        format: 'npm',
        repository: name.repo,
      })
    }
  }

  private async deleteNpmRepos(projectSlug: string) {
    const repoPaths = [
      generateNpmGroupRepoName(projectSlug),
      generateNpmHostedRepoName(projectSlug),
    ]
    const privileges = [
      generateNpmGroupPrivilegeName(projectSlug),
      generateNpmHostedPrivilegeName(projectSlug),
    ]
    await Promise.all(privileges.map(privilege => this.client.deleteSecurityPrivileges(privilege)))
    await Promise.all(repoPaths.map(repo => this.client.deleteRepositoriesByName(repo)))
  }

  private async ensureRole(projectSlug: string, privileges: string[]) {
    const roleId = `${projectSlug}-ID`
    const role = await this.client.getSecurityRoles(roleId)
    if (!role) {
      await this.client.createSecurityRoles({
        id: roleId,
        name: `${projectSlug}-role`,
        description: 'desc',
        privileges,
      })
      return
    }
    await this.client.updateSecurityRoles(roleId, {
      id: roleId,
      name: `${projectSlug}-role`,
      privileges,
    })
  }

  private async ensureUser(projectSlug: string, ownerEmail: string, password: string | undefined) {
    const ensuredPassword = password ?? generateRandomPassword(30)
    const users = await this.client.getSecurityUsers(projectSlug)
    const existing = users.find(u => u.userId === projectSlug)
    if (existing) {
      if (password) {
        await this.client.updateSecurityUsersChangePassword(projectSlug, ensuredPassword)
      }
      return ensuredPassword
    }

    await this.client.createSecurityUsers({
      userId: projectSlug,
      firstName: 'Monkey D.',
      lastName: 'Luffy',
      emailAddress: ownerEmail,
      password: ensuredPassword,
      status: 'active',
      roles: [`${projectSlug}-ID`],
    })
    return ensuredPassword
  }

  @StartActiveSpan()
  private async deleteProject(projectSlug: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    await Promise.all([
      this.deleteMavenRepos(projectSlug),
      this.deleteNpmRepos(projectSlug),
    ])

    await Promise.all([
      this.client.deleteSecurityRoles(`${projectSlug}-ID`),
      this.client.deleteSecurityUsers(projectSlug),
    ])

    const vaultPath = getProjectVaultPath(this.config.projectRootDir, projectSlug, 'tech/NEXUS')
    try {
      await this.vault.delete(vaultPath)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    }
  }
}

function generateMavenHostedPrivilegeName(projectSlug: string, kind: MavenHostedRepoKind) {
  return `${projectSlug}-privilege-${kind}`
}

function generateMavenGroupRepoName(projectSlug: string) {
  return `${projectSlug}-repository-group`
}

function generateMavenGroupPrivilegeName(projectSlug: string) {
  return `${projectSlug}-privilege-group`
}

function generateNpmHostedPrivilegeName(projectSlug: string) {
  return `${projectSlug}-npm-privilege`
}

function generateNpmGroupRepoName(projectSlug: string) {
  return `${projectSlug}-npm-group`
}

function generateNpmGroupPrivilegeName(projectSlug: string) {
  return `${projectSlug}-npm-group-privilege`
}
