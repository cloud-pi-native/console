import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { specificallyEnabled } from '@cpn-console/hooks'

import { NexusDatastoreService } from './nexus-datastore.service'
import type { ProjectWithDetails } from './nexus-datastore.service'
import { NexusClientService } from './nexus-client.service'
import { VaultService } from '../vault/vault.service'
import { VaultError } from '../vault/vault-client.service'
import { NEXUS_CONFIG_KEYS } from './nexus.constants'
import { generateRandomPassword, generateMavenRepoNames, generateNpmRepoNames, getPluginConfig, getProjectVaultPath } from './nexus.utils'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'

@Injectable()
export class NexusControllerService {
  private readonly logger = new Logger(NexusControllerService.name)

  constructor(
    @Inject(NexusDatastoreService) private readonly nexusDatastore: NexusDatastoreService,
    @Inject(NexusClientService) private readonly client: NexusClientService,
    @Inject(VaultService) private readonly vault: VaultService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
    this.logger.log('NexusControllerService initialized')
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
    const privilegesToAccess = [
      ...await this.ensureMavenRepo(project),
      ...await this.ensureNpmRepo(project),
    ]

    await this.upsertRole(projectSlug, privilegesToAccess)

    const vaultPath = getProjectVaultPath(this.config.projectRootPath, projectSlug, 'tech/NEXUS')
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
    const password = existingPassword ?? generateRandomPassword(30)

    await this.ensureUser(projectSlug, ownerEmail, password)
    await this.vault.write({
      NEXUS_PASSWORD: password,
      NEXUS_USERNAME: projectSlug,
    }, vaultPath)
  }

  private async ensureMavenRepo(project: ProjectWithDetails): Promise<string[]> {
    const enabled = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEYS.activateMavenRepo))
    const span = trace.getActiveSpan()
    span?.setAttribute('nexus.maven.enabled', enabled ?? false)

    const projectSlug = project.slug
    if (!enabled) {
      await this.deleteMavenRepos(projectSlug)
      return []
    }

    const mavenSnapshotWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEYS.mavenSnapshotWritePolicy) ?? 'allow'
    const mavenReleaseWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEYS.mavenReleaseWritePolicy) ?? 'allow_once'
    const names = await this.createMavenRepos(projectSlug, {
      snapshotWritePolicy: mavenSnapshotWritePolicy,
      releaseWritePolicy: mavenReleaseWritePolicy,
    })
    return [names.group.privilege, ...names.hosted.map(({ privilege }) => privilege)]
  }

  private async ensureNpmRepo(project: ProjectWithDetails): Promise<string[]> {
    const enabled = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEYS.activateNpmRepo))
    const span = trace.getActiveSpan()
    span?.setAttribute('nexus.npm.enabled', enabled ?? false)

    const projectSlug = project.slug
    if (!enabled) {
      await this.deleteNpmRepos(projectSlug)
      return []
    }

    const npmWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEYS.npmWritePolicy) ?? 'allow'
    const names = await this.createNpmRepos(projectSlug, npmWritePolicy)
    return [names.group.privilege, ...names.hosted.map(({ privilege }) => privilege)]
  }

  private async upsertPrivilege(body: { name: string, description: string, actions: string[], format: string, repository: string }) {
    const existing = await this.client.getSecurityPrivileges(body.name)
    if (!existing) {
      await this.client.createSecurityPrivilegesRepositoryView(body)
      return
    }
    await this.client.updateSecurityPrivilegesRepositoryView(body.name, body)
  }

  private async createMavenRepos(projectSlug: string, options: { snapshotWritePolicy: string, releaseWritePolicy: string }) {
    const names = generateMavenRepoNames(projectSlug)

    await Promise.all([
      (async () => {
        const existing = await this.client.getRepositoriesMavenHosted(names.hosted[0].repo)
        const body = {
          name: names.hosted[0].repo,
          online: true,
          storage: {
            blobStoreName: 'default',
            strictContentTypeValidation: true,
            writePolicy: options.releaseWritePolicy,
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
        await this.client.updateRepositoriesMavenHosted(names.hosted[0].repo, body)
      })(),
      (async () => {
        const existing = await this.client.getRepositoriesMavenHosted(names.hosted[1].repo)
        const body = {
          name: names.hosted[1].repo,
          online: true,
          storage: {
            blobStoreName: 'default',
            strictContentTypeValidation: true,
            writePolicy: options.snapshotWritePolicy,
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
        await this.client.updateRepositoriesMavenHosted(names.hosted[1].repo, body)
      })(),
    ])

    try {
      await this.client.createRepositoriesMavenGroup({
        name: names.group.repo,
        online: true,
        storage: {
          blobStoreName: 'default',
          strictContentTypeValidation: true,
        },
        group: {
          memberNames: [
            ...names.hosted.map(({ repo }) => repo),
            'maven-public',
          ],
        },
      })
    } catch {
    }

    for (const name of [...names.hosted, names.group]) {
      try {
        await this.client.createSecurityPrivilegesRepositoryView({
          name: name.privilege,
          description: `Privilege for organization ${projectSlug} for repo ${name.repo}`,
          actions: ['all'],
          format: 'maven2',
          repository: name.repo,
        })
      } catch {
      }
    }

    return names
  }

  private async deleteMavenRepos(projectSlug: string) {
    const names = generateMavenRepoNames(projectSlug)
    const repoPaths = [names.group, ...names.hosted]
    const privileges = [...names.hosted, names.group]
    const pathsToDelete = [
      ...privileges.map(({ privilege }) => `/security/privileges/${encodeURIComponent(privilege)}`),
      ...repoPaths.map(repo => `/repositories/${encodeURIComponent(repo.repo)}`),
    ]
    for (const path of pathsToDelete) {
      if (path.startsWith('/security/privileges/')) {
        const name = decodeURIComponent(path.split('/').pop()!)
        await this.client.deleteSecurityPrivileges(name)
      } else if (path.startsWith('/repositories/')) {
        const name = decodeURIComponent(path.split('/').pop()!)
        await this.client.deleteRepositoriesByName(name)
      }
    }
  }

  private async createNpmRepos(projectSlug: string, writePolicy: string) {
    const names = generateNpmRepoNames(projectSlug)

    {
      const existing = await this.client.getRepositoriesNpmHosted(names.hosted[0].repo)
      const body = {
        name: names.hosted[0].repo,
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
      } else {
        await this.client.updateRepositoriesNpmHosted(names.hosted[0].repo, body)
      }
    }

    {
      const existing = await this.client.getRepositoriesNpmGroup(names.group.repo)
      const body = {
        name: names.group.repo,
        online: true,
        storage: {
          blobStoreName: 'default',
          strictContentTypeValidation: true,
        },
        group: {
          memberNames: [
            ...names.hosted.map(({ repo }) => repo),
          ],
        },
      }
      if (!existing) {
        await this.client.postRepositoriesNpmGroup(body)
      } else {
        await this.client.putRepositoriesNpmGroup(names.group.repo, body)
      }
    }

    for (const name of [...names.hosted, names.group]) {
      await this.upsertPrivilege({
        name: name.privilege,
        description: `Privilege for organization ${projectSlug} for repo ${name.repo}`,
        actions: ['all'],
        format: 'npm',
        repository: name.repo,
      })
    }
    return names
  }

  private async deleteNpmRepos(projectSlug: string) {
    const names = generateNpmRepoNames(projectSlug)
    const repoPaths = [names.group, ...names.hosted]
    const privileges = [...names.hosted, names.group]
    const pathsToDelete = [
      ...privileges.map(({ privilege }) => `/security/privileges/${encodeURIComponent(privilege)}`),
      ...repoPaths.map(repo => `/repositories/${encodeURIComponent(repo.repo)}`),
    ]
    for (const path of pathsToDelete) {
      if (path.startsWith('/security/privileges/')) {
        const name = decodeURIComponent(path.split('/').pop()!)
        await this.client.deleteSecurityPrivileges(name)
      } else if (path.startsWith('/repositories/')) {
        const name = decodeURIComponent(path.split('/').pop()!)
        await this.client.deleteRepositoriesByName(name)
      }
    }
  }

  private async upsertRole(projectSlug: string, privileges: string[]) {
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

  private async ensureUser(projectSlug: string, ownerEmail: string, password: string) {
    const users = await this.client.getSecurityUsers(projectSlug)
    const existing = users.find(u => u.userId === projectSlug)
    if (existing) {
      await this.client.updateSecurityUsersChangePassword(projectSlug, password)
      return
    }

    await this.client.createSecurityUsers({
      userId: projectSlug,
      firstName: 'Monkey D.',
      lastName: 'Luffy',
      emailAddress: ownerEmail,
      password,
      status: 'active',
      roles: [`${projectSlug}-ID`],
    })
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

    const vaultPath = getProjectVaultPath(this.config.projectRootPath, projectSlug, 'tech/NEXUS')
    try {
      await this.vault.destroy(vaultPath)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    }
  }
}
