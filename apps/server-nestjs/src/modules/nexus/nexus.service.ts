import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { VaultService } from '../vault/vault.service'
import { NexusClientService } from './nexus-client.service'
import { assertWritePolicy, generateRandomPassword, getProjectVaultPath } from './nexus.utils'
import type { WritePolicy } from './nexus.utils'

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

  private async upsertRepo<TBody>(options: {
    getUrl: string
    createUrl: string
    updateUrl: string
    createStatus: number
    updateStatus: number
    body: TBody
  }) {
    const existing = await this.client.axios({
      method: 'GET',
      url: options.getUrl,
      validateStatus: code => [200, 404].includes(code),
    })
    if (existing.status === 404) {
      await this.client.axios({
        method: 'post',
        url: options.createUrl,
        data: options.body,
        validateStatus: code => [options.createStatus].includes(code),
      })
      return
    }
    await this.client.axios({
      method: 'put',
      url: options.updateUrl,
      data: options.body,
      validateStatus: code => [options.updateStatus].includes(code),
    })
  }

  private async upsertPrivilege(body: { name: string, description: string, actions: string[], format: string, repository: string }) {
    const existing = await this.client.axios({
      method: 'get',
      url: `/security/privileges/${encodeURIComponent(body.name)}`,
      validateStatus: code => [200, 404].includes(code),
    })
    if (existing.status === 404) {
      await this.client.axios({
        method: 'post',
        url: '/security/privileges/repository-view',
        data: body,
        validateStatus: code => [201].includes(code),
      })
      return
    }

    await this.client.axios({
      method: 'put',
      url: `/security/privileges/repository-view/${encodeURIComponent(body.name)}`,
      data: body,
      validateStatus: code => [204].includes(code),
    })
  }

  private async createMavenRepos(projectSlug: string, options: { snapshotWritePolicy: WritePolicy, releaseWritePolicy: WritePolicy }) {
    const names = this.getMavenRepoNames(projectSlug)

    await Promise.all([
      this.upsertRepo({
        getUrl: `/repositories/maven/hosted/${encodeURIComponent(names.hosted[0].repo)}`,
        createUrl: '/repositories/maven/hosted',
        updateUrl: `/repositories/maven/hosted/${encodeURIComponent(names.hosted[0].repo)}`,
        createStatus: 201,
        updateStatus: 204,
        body: {
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
        },
      }),
      this.upsertRepo({
        getUrl: `/repositories/maven/hosted/${encodeURIComponent(names.hosted[1].repo)}`,
        createUrl: '/repositories/maven/hosted',
        updateUrl: `/repositories/maven/hosted/${encodeURIComponent(names.hosted[1].repo)}`,
        createStatus: 201,
        updateStatus: 204,
        body: {
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
        },
      }),
    ])

    await this.client.axios({
      method: 'post',
      url: '/repositories/maven/group',
      data: {
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
      },
      validateStatus: code => [201, 400].includes(code),
    })

    for (const name of [...names.hosted, names.group]) {
      await this.client.axios({
        method: 'post',
        url: '/security/privileges/repository-view',
        data: {
          name: name.privilege,
          description: `Privilege for organization ${projectSlug} for repo ${name.repo}`,
          actions: ['all'],
          format: 'maven2',
          repository: name.repo,
        },
        validateStatus: code => [201, 400].includes(code),
      })
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
      await this.client.deleteIfExists(path)
    }
  }

  private async createNpmRepos(projectSlug: string, writePolicy: WritePolicy) {
    const names = this.getNpmRepoNames(projectSlug)

    await this.upsertRepo({
      getUrl: `/repositories/npm/hosted/${encodeURIComponent(names.hosted[0].repo)}`,
      createUrl: '/repositories/npm/hosted',
      updateUrl: `/repositories/npm/hosted/${encodeURIComponent(names.hosted[0].repo)}`,
      createStatus: 201,
      updateStatus: 204,
      body: {
        name: names.hosted[0].repo,
        online: true,
        storage: {
          blobStoreName: 'default',
          strictContentTypeValidation: true,
          writePolicy,
        },
        cleanup: { policyNames: ['string'] },
        component: { proprietaryComponents: true },
      },
    })

    await this.upsertRepo({
      getUrl: `/repositories/npm/group/${encodeURIComponent(names.group.repo)}`,
      createUrl: '/repositories/npm/group',
      updateUrl: `/repositories/npm/group/${encodeURIComponent(names.group.repo)}`,
      createStatus: 201,
      updateStatus: 204,
      body: {
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
      },
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
      await this.client.deleteIfExists(path)
    }
  }

  private async upsertRole(projectSlug: string, privileges: string[]) {
    const roleId = `${projectSlug}-ID`
    const role = await this.client.axios({
      method: 'GET',
      url: `security/roles/${encodeURIComponent(roleId)}`,
      validateStatus: code => [200, 404].includes(code),
    })
    if (role.status === 404) {
      await this.client.axios({
        method: 'post',
        url: '/security/roles',
        data: {
          id: roleId,
          name: `${projectSlug}-role`,
          description: 'desc',
          privileges,
        },
        validateStatus: code => [200].includes(code),
      })
      return
    }

    await this.client.axios({
      method: 'PUT',
      url: `security/roles/${encodeURIComponent(roleId)}`,
      data: {
        id: roleId,
        name: `${projectSlug}-role`,
        privileges,
      },
      validateStatus: code => [204].includes(code),
    })
  }

  private async ensureUser(projectSlug: string, ownerEmail: string, password: string) {
    const getUser = await this.client.axios({
      url: `/security/users?userId=${encodeURIComponent(projectSlug)}`,
    }) as { data: { userId: string }[] }

    const existing = getUser.data.find(u => u.userId === projectSlug)
    if (existing) {
      await this.client.axios({
        method: 'put',
        url: `/security/users/${encodeURIComponent(projectSlug)}/change-password`,
        data: password,
        headers: {
          'Content-Type': 'text/plain',
        },
      })
      return
    }

    await this.client.axios({
      method: 'post',
      url: '/security/users',
      data: {
        userId: projectSlug,
        firstName: 'Monkey D.',
        lastName: 'Luffy',
        emailAddress: ownerEmail,
        password,
        status: 'active',
        roles: [`${projectSlug}-ID`],
      },
    })
  }

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
    const vaultSecret = await this.vault.read(vaultPath) as { data?: { NEXUS_PASSWORD?: string } } | null
    const password = vaultSecret?.data?.NEXUS_PASSWORD ?? generateRandomPassword(30)

    await this.ensureUser(projectSlug, args.ownerEmail, password)
    await this.vault.write({
      NEXUS_PASSWORD: password,
      NEXUS_USERNAME: projectSlug,
    }, vaultPath)
  }

  async deleteProject(projectSlug: string) {
    await Promise.all([
      this.deleteMavenRepos(projectSlug),
      this.deleteNpmRepos(projectSlug),
    ])

    await Promise.all([
      this.client.deleteIfExists(`/security/roles/${encodeURIComponent(`${projectSlug}-ID`)}`),
      this.client.axios({
        method: 'delete',
        url: `/security/users/${encodeURIComponent(projectSlug)}`,
        validateStatus: code => code === 404 || code < 300,
      }),
    ])

    const vaultPath = getProjectVaultPath(this.config.projectRootPath, projectSlug, 'tech/NEXUS')
    await this.vault.destroy(vaultPath)
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
