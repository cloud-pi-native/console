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
import { assertWritePolicy, generateRandomPassword, getMavenRepoNames, getNpmRepoNames, getPluginConfig, getProjectVaultPath } from './nexus.utils'
import type { WritePolicy } from './nexus.utils'
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
    await this.reconcileProject(project)
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
    await Promise.all(projects.map(p => this.reconcileProject(p)))
  }

  @StartActiveSpan()
  private async reconcileProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)

    const enableMaven = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEYS.activateMavenRepo)) === true
    const enableNpm = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEYS.activateNpmRepo)) === true

    await this.provisionProject({
      projectSlug: project.slug,
      ownerEmail: project.owner.email,
      enableMaven,
      enableNpm,
      mavenSnapshotWritePolicy: getPluginConfig(project, NEXUS_CONFIG_KEYS.mavenSnapshotWritePolicy) ?? undefined,
      mavenReleaseWritePolicy: getPluginConfig(project, NEXUS_CONFIG_KEYS.mavenReleaseWritePolicy) ?? undefined,
      npmWritePolicy: getPluginConfig(project, NEXUS_CONFIG_KEYS.npmWritePolicy) ?? undefined,
    })
  }

  private async upsertPrivilege(body: { name: string, description: string, actions: string[], format: string, repository: string }) {
    const existing = await this.client.getSecurityPrivileges(body.name)
    if (!existing) {
      await this.client.postSecurityPrivilegesRepositoryView(body)
      return
    }
    await this.client.putSecurityPrivilegesRepositoryView(body.name, body)
  }

  private async upsertRepo(options: {
    get: () => Promise<any | null>
    create: () => Promise<void>
    update: () => Promise<void>
  }) {
    const existing = await options.get()
    if (!existing) {
      await options.create()
      return
    }
    await options.update()
  }

  private async createMavenRepos(projectSlug: string, options: { snapshotWritePolicy: WritePolicy, releaseWritePolicy: WritePolicy }) {
    const names = getMavenRepoNames(projectSlug)

    await Promise.all([
      this.upsertRepo({
        get: () => this.client.getRepositoriesMavenHosted(names.hosted[0].repo),
        create: () => this.client.postRepositoriesMavenHosted({
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
        }),
        update: () => this.client.putRepositoriesMavenHosted(names.hosted[0].repo, {
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
        }),
      }),
      this.upsertRepo({
        get: () => this.client.getRepositoriesMavenHosted(names.hosted[1].repo),
        create: () => this.client.postRepositoriesMavenHosted({
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
        }),
        update: () => this.client.putRepositoriesMavenHosted(names.hosted[1].repo, {
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
        }),
      }),
    ])

    try {
      await this.client.postRepositoriesMavenGroup({
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
        await this.client.postSecurityPrivilegesRepositoryView({
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
    const names = getMavenRepoNames(projectSlug)
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

  private async createNpmRepos(projectSlug: string, writePolicy: WritePolicy) {
    const names = getNpmRepoNames(projectSlug)

    await this.upsertRepo({
      get: () => this.client.getRepositoriesNpmHosted(names.hosted[0].repo),
      create: () => this.client.postRepositoriesNpmHosted({
        name: names.hosted[0].repo,
        online: true,
        storage: {
          blobStoreName: 'default',
          strictContentTypeValidation: true,
          writePolicy,
        },
        cleanup: { policyNames: ['string'] },
        component: { proprietaryComponents: true },
      }),
      update: () => this.client.putRepositoriesNpmHosted(names.hosted[0].repo, {
        name: names.hosted[0].repo,
        online: true,
        storage: {
          blobStoreName: 'default',
          strictContentTypeValidation: true,
          writePolicy,
        },
        cleanup: { policyNames: ['string'] },
        component: { proprietaryComponents: true },
      }),
    })

    await this.upsertRepo({
      get: () => this.client.getRepositoriesNpmGroup(names.group.repo),
      create: () => this.client.postRepositoriesNpmGroup({
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
      }),
      update: () => this.client.putRepositoriesNpmGroup(names.group.repo, {
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
      }),
    })

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
    const names = getNpmRepoNames(projectSlug)
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
      await this.client.postSecurityRoles({
        id: roleId,
        name: `${projectSlug}-role`,
        description: 'desc',
        privileges,
      })
      return
    }
    await this.client.putSecurityRoles(roleId, {
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
  private async provisionProject(args: {
    projectSlug: string
    ownerEmail: string
    enableMaven: boolean
    enableNpm: boolean
    mavenSnapshotWritePolicy?: string
    mavenReleaseWritePolicy?: string
    npmWritePolicy?: string
  }) {
    const projectSlug = args.projectSlug
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'nexus.maven.enabled': args.enableMaven,
      'nexus.npm.enabled': args.enableNpm,
    })

    const mavenSnapshotWritePolicy = args.mavenSnapshotWritePolicy ?? 'allow'
    const mavenReleaseWritePolicy = args.mavenReleaseWritePolicy ?? 'allow_once'
    const npmWritePolicy = args.npmWritePolicy ?? 'allow'

    assertWritePolicy(mavenSnapshotWritePolicy)
    assertWritePolicy(mavenReleaseWritePolicy)
    assertWritePolicy(npmWritePolicy)

    const privilegesToAccess: string[] = []

    if (args.enableMaven) {
      const names = await this.createMavenRepos(projectSlug, {
        snapshotWritePolicy: mavenSnapshotWritePolicy,
        releaseWritePolicy: mavenReleaseWritePolicy,
      })
      privilegesToAccess.push(names.group.privilege, ...names.hosted.map(({ privilege }) => privilege))
    } else {
      await this.deleteMavenRepos(projectSlug)
    }

    if (args.enableNpm) {
      const names = await this.createNpmRepos(projectSlug, npmWritePolicy)
      privilegesToAccess.push(names.group.privilege, ...names.hosted.map(({ privilege }) => privilege))
    } else {
      await this.deleteNpmRepos(projectSlug)
    }

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

    await this.ensureUser(projectSlug, args.ownerEmail, password)
    await this.vault.write({
      NEXUS_PASSWORD: password,
      NEXUS_USERNAME: projectSlug,
    }, vaultPath)
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
