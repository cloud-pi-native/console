import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { VaultService } from '../vault/vault.service'
import { VaultError } from '../vault/vault-client.service'
import { NexusClientService } from './nexus-client.service'
import { assertWritePolicy, generateRandomPassword, getProjectVaultPath } from './nexus.utils'
import type { WritePolicy } from './nexus.utils'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'

interface MavenRepoNames {
  hosted: Array<{ repo: string, privilege: string }>
  group: { repo: string, privilege: string }
}

interface NpmRepoNames {
  hosted: Array<{ repo: string, privilege: string }>
  group: { repo: string, privilege: string }
}

@Injectable()
export class NexusService {
  constructor(
    @Inject(NexusClientService) private readonly client: NexusClientService,
    @Inject(VaultService) private readonly vault: VaultService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  private getMavenRepoNames(projectSlug: string): MavenRepoNames {
    return {
      hosted: [
        {
          repo: `${projectSlug}-repository-release`,
          privilege: `${projectSlug}-privilege-release`,
        },
        {
          repo: `${projectSlug}-repository-snapshot`,
          privilege: `${projectSlug}-privilege-snapshot`,
        },
      ],
      group: {
        repo: `${projectSlug}-repository-group`,
        privilege: `${projectSlug}-privilege-group`,
      },
    }
  }

  private getNpmRepoNames(projectSlug: string): NpmRepoNames {
    return {
      hosted: [
        {
          repo: `${projectSlug}-npm`,
          privilege: `${projectSlug}-npm-privilege`,
        },
      ],
      group: {
        repo: `${projectSlug}-npm-group`,
        privilege: `${projectSlug}-npm-group-privilege`,
      },
    }
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

  private async upsertPrivilege(body: { name: string, description: string, actions: string[], format: string, repository: string }) {
    const existing = await this.client.getSecurityPrivileges(body.name)
    if (!existing) {
      await this.client.postSecurityPrivilegesRepositoryView(body)
      return
    }
    await this.client.putSecurityPrivilegesRepositoryView(body.name, body)
  }

  private async createMavenRepos(projectSlug: string, options: { snapshotWritePolicy: WritePolicy, releaseWritePolicy: WritePolicy }) {
    const names = this.getMavenRepoNames(projectSlug)

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
    const names = this.getMavenRepoNames(projectSlug)
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
    const names = this.getNpmRepoNames(projectSlug)

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
    const names = this.getNpmRepoNames(projectSlug)
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
      await this.client.putSecurityUsersChangePassword(projectSlug, password)
      return
    }

    await this.client.postSecurityUsers({
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
  async provisionProject(args: {
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
  async deleteProject(projectSlug: string) {
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

  getProjectSecrets(args: { projectSlug: string, enableMaven: boolean, enableNpm: boolean }) {
    const projectSlug = args.projectSlug
    const nexusUrl = this.config.nexusSecretExposedUrl!
    const secrets: Record<string, string> = {}
    if (args.enableMaven) {
      const names = this.getMavenRepoNames(projectSlug)
      secrets.MAVEN_REPO_RELEASE = `${nexusUrl}/${names.hosted[0].repo}`
      secrets.MAVEN_REPO_SNAPSHOT = `${nexusUrl}/${names.hosted[1].repo}`
    }
    if (args.enableNpm) {
      const names = this.getNpmRepoNames(projectSlug)
      secrets.NPM_REPO = `${nexusUrl}/${names.hosted[0].repo}`
    }
    return secrets
  }
}
