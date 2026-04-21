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
    await this.deleteProject(project)
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
    span?.setAttribute('project.slug', project.slug)

    const enableMaven = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO)) ?? false
    const enableNpm = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO)) ?? false

    const mavenSnapshotWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEY_MAVEN_SNAPSHOT_WRITE_POLICY) ?? DEFAULT_MAVEN_SNAPSHOT_WRITE_POLICY
    const mavenReleaseWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEY_MAVEN_RELEASE_WRITE_POLICY) ?? DEFAULT_MAVEN_RELEASE_WRITE_POLICY
    const npmWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEY_NPM_WRITE_POLICY) ?? DEFAULT_NPM_WRITE_POLICY

    await Promise.all([
      enableMaven
        ? this.ensureMavenRepos(project, { snapshotWritePolicy: mavenSnapshotWritePolicy, releaseWritePolicy: mavenReleaseWritePolicy })
        : this.deleteMavenRepos(project),
      enableNpm
        ? this.ensureNpmRepos(project, npmWritePolicy)
        : this.deleteNpmRepos(project),
    ])

    const privileges = [
      ...(enableMaven
        ? [
            generateMavenGroupPrivilegeName(project),
            generateMavenHostedPrivilegeName(project, 'release'),
            generateMavenHostedPrivilegeName(project, 'snapshot'),
          ]
        : []),
      ...(enableNpm
        ? [
            generateNpmGroupPrivilegeName(project),
            generateNpmHostedPrivilegeName(project),
          ]
        : []),
    ]
    await this.ensureRole(project, privileges)
    await this.ensureUser(project)
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

  private async ensureMavenRepos(project: ProjectWithDetails, options: EnsureMavenReposOptions) {
    const releaseRepoName = generateMavenHostedRepoName(project, 'release')
    const snapshotRepoName = generateMavenHostedRepoName(project, 'snapshot')
    const groupRepoName = generateMavenGroupRepoName(project)

    const releasePrivilege = generateMavenHostedPrivilegeName(project, 'release')
    const snapshotPrivilege = generateMavenHostedPrivilegeName(project, 'snapshot')
    const groupPrivilege = generateMavenGroupPrivilegeName(project)

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
    await this.ensureMavenPrivileges(project, privilegesToEnsure)
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

  private async ensureMavenPrivileges(project: ProjectWithDetails, entries: Array<{ repo: string, privilege: string }>) {
    for (const entry of entries) {
      await this.upsertPrivilege({
        type: 'maven',
        name: entry.privilege,
        description: `Privilege for organization ${project.slug} for repo ${entry.repo}`,
        actions: ['all'],
        format: 'maven2',
        repository: entry.repo,
      })
    }
  }

  private async deleteMavenRepos(project: ProjectWithDetails) {
    const repoPaths = [
      generateMavenGroupRepoName(project),
      generateMavenHostedRepoName(project, 'release'),
      generateMavenHostedRepoName(project, 'snapshot'),
    ]
    const privileges = [
      generateMavenGroupPrivilegeName(project),
      generateMavenHostedPrivilegeName(project, 'release'),
      generateMavenHostedPrivilegeName(project, 'snapshot'),
    ]
    await Promise.all(privileges.map(privilege => this.client.deleteSecurityPrivileges(privilege)))
    await Promise.all(repoPaths.map(repo => this.client.deleteRepositoriesByName(repo)))
  }

  private async ensureNpmRepos(project: ProjectWithDetails, writePolicy: string) {
    const hostedRepoName = generateNpmHostedRepoName(project)
    const groupRepoName = generateNpmGroupRepoName(project)

    const hostedPrivilege = generateNpmHostedPrivilegeName(project)
    const groupPrivilege = generateNpmGroupPrivilegeName(project)

    await this.ensureNpmHostedRepo(hostedRepoName, writePolicy)
    await this.ensureNpmGroupRepo(groupRepoName, [hostedRepoName])

    for (const name of [
      { repo: hostedRepoName, privilege: hostedPrivilege },
      { repo: groupRepoName, privilege: groupPrivilege },
    ]) {
      await this.upsertPrivilege({
        type: 'npm',
        name: name.privilege,
        description: `Privilege for organization ${project.slug} for repo ${name.repo}`,
        actions: ['all'],
        format: 'npm',
        repository: name.repo,
      })
    }
  }

  private async deleteNpmRepos(project: ProjectWithDetails) {
    const repoPaths = [
      generateNpmGroupRepoName(project),
      generateNpmHostedRepoName(project),
    ]
    const privileges = [
      generateNpmGroupPrivilegeName(project),
      generateNpmHostedPrivilegeName(project),
    ]
    await Promise.all(privileges.map(privilege => this.client.deleteSecurityPrivileges(privilege)))
    await Promise.all(repoPaths.map(repo => this.client.deleteRepositoriesByName(repo)))
  }

  private async ensureRole(project: ProjectWithDetails, privileges: string[]) {
    const roleId = `${project.slug}-ID`
    const role = await this.client.getSecurityRoles(roleId)
    if (!role) {
      await this.client.createSecurityRoles({
        id: roleId,
        name: `${project.slug}-role`,
        description: 'desc',
        privileges,
      })
      return
    }
    await this.client.updateSecurityRoles(roleId, {
      id: roleId,
      name: `${project.slug}-role`,
      privileges,
    })
  }

  private async ensureUser(project: ProjectWithDetails) {
    const vaultPath = getProjectVaultPath(this.config.projectRootDir, project.slug, 'tech/NEXUS')
    let existingPassword: string | undefined
    try {
      existingPassword = await this.vault.read(vaultPath).then(res => res.data?.NEXUS_PASSWORD)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') {
        existingPassword = undefined
      } else {
        throw error
      }
    }

    const ensuredPassword = existingPassword ?? generateRandomPassword(30)
    const users = await this.client.getSecurityUsers(project.slug)
    const existing = users.find(u => u.userId === project.slug)
    if (existing) {
      if (!existingPassword || existingPassword !== ensuredPassword) {
        await this.client.updateSecurityUsersChangePassword(project.slug, ensuredPassword)
      }
    } else {
      await this.client.createSecurityUsers({
        userId: project.slug,
        firstName: project.owner.firstName,
        lastName: project.owner.lastName,
        emailAddress: project.owner.email,
        password: ensuredPassword,
        status: 'active',
        roles: [`${project.slug}-ID`],
      })
    }

    await this.vault.write({
      NEXUS_PASSWORD: ensuredPassword,
      NEXUS_USERNAME: project.slug,
    }, vaultPath)
  }

  @StartActiveSpan()
  private async deleteProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    await Promise.all([
      this.deleteMavenRepos(project),
      this.deleteNpmRepos(project),
    ])

    await Promise.all([
      this.client.deleteSecurityRoles(`${project.slug}-ID`),
      this.client.deleteSecurityUsers(project.slug),
    ])

    const vaultPath = getProjectVaultPath(this.config.projectRootDir, project.slug, 'tech/NEXUS')
    try {
      await this.vault.delete(vaultPath)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    }
  }
}

function generateMavenHostedPrivilegeName(project: ProjectWithDetails, kind: MavenHostedRepoKind) {
  return `${project.slug}-privilege-${kind}`
}

function generateMavenGroupRepoName(project: ProjectWithDetails) {
  return `${project.slug}-repository-group`
}

function generateMavenGroupPrivilegeName(project: ProjectWithDetails) {
  return `${project.slug}-privilege-group`
}

function generateNpmHostedPrivilegeName(project: ProjectWithDetails) {
  return `${project.slug}-npm-privilege`
}

function generateNpmGroupRepoName(project: ProjectWithDetails) {
  return `${project.slug}-npm-group`
}

function generateNpmGroupPrivilegeName(project: ProjectWithDetails) {
  return `${project.slug}-npm-group-privilege`
}
