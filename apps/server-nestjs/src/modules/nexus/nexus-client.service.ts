import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { NexusError, NexusHttpClientService } from './nexus-http-client.service'
import { generateMavenHostedRepoName, generateNpmHostedRepoName } from './nexus.utils'

interface NexusRepositoryStorage {
  blobStoreName: string
  strictContentTypeValidation: boolean
  writePolicy?: string
}

interface NexusRepositoryCleanup {
  policyNames: string[]
}

interface NexusRepositoryComponent {
  proprietaryComponents: boolean
}

interface NexusRepositoryGroup {
  memberNames: string[]
}

interface NexusMavenHostedRepositoryUpsertRequest {
  name: string
  online: boolean
  storage: NexusRepositoryStorage & { writePolicy: string }
  cleanup: NexusRepositoryCleanup
  component: NexusRepositoryComponent
  maven: {
    versionPolicy: string
    layoutPolicy: string
    contentDisposition: string
  }
}

interface NexusMavenGroupRepositoryUpsertRequest {
  name: string
  online: boolean
  storage: Omit<NexusRepositoryStorage, 'writePolicy'>
  group: NexusRepositoryGroup
}

interface NexusNpmHostedRepositoryUpsertRequest {
  name: string
  online: boolean
  storage: NexusRepositoryStorage & { writePolicy: string }
  cleanup: NexusRepositoryCleanup
  component: NexusRepositoryComponent
}

interface NexusNpmGroupRepositoryUpsertRequest {
  name: string
  online: boolean
  storage: Omit<NexusRepositoryStorage, 'writePolicy'>
  group: NexusRepositoryGroup
}

interface NexusRepositoryViewPrivilegeUpsertRequest {
  name: string
  description: string
  actions: string[]
  format: string
  repository: string
}

interface NexusRoleCreateRequest {
  id: string
  name: string
  description: string
  privileges: string[]
}

interface NexusRoleUpdateRequest {
  id: string
  name: string
  privileges: string[]
}

interface NexusUserCreateRequest {
  userId: string
  firstName: string
  lastName: string
  emailAddress: string
  password: string
  status: string
  roles: string[]
}

export interface NexusMavenHostedRepository extends NexusMavenHostedRepositoryUpsertRequest {
  url: string
  format: string
  type: string
}

export interface NexusMavenGroupRepository extends NexusMavenGroupRepositoryUpsertRequest {
  url: string
  format: string
  type: string
}

export interface NexusNpmHostedRepository extends NexusNpmHostedRepositoryUpsertRequest {
  url: string
  format: string
  type: string
}

export interface NexusNpmGroupRepository extends NexusNpmGroupRepositoryUpsertRequest {
  url: string
  format: string
  type: string
}

export interface NexusPrivilege extends NexusRepositoryViewPrivilegeUpsertRequest {
  type: string
}

export interface NexusRole extends NexusRoleCreateRequest {
  roles: string[]
  source: string
}

@Injectable()
export class NexusClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(NexusHttpClientService) private readonly http: NexusHttpClientService,
  ) {}

  private get secretExposedUrl() {
    const url = this.config.nexusSecretExposedUrl
    if (!url) {
      throw new NexusError('NotConfigured', 'NEXUS_URL is required')
    }
    return url
  }

  getProjectSecrets(args: { projectSlug: string, enableMaven: boolean, enableNpm: boolean }) {
    const projectSlug = args.projectSlug
    const nexusUrl = this.secretExposedUrl
    const secrets: Record<string, string> = {}
    if (args.enableMaven) {
      secrets.MAVEN_REPO_RELEASE = `${nexusUrl}/${generateMavenHostedRepoName(projectSlug, 'release')}`
      secrets.MAVEN_REPO_SNAPSHOT = `${nexusUrl}/${generateMavenHostedRepoName(projectSlug, 'snapshot')}`
    }
    if (args.enableNpm) {
      secrets.NPM_REPO = `${nexusUrl}/${generateNpmHostedRepoName(projectSlug)}`
    }
    return secrets
  }

  @StartActiveSpan()
  async getRepositoriesMavenHosted(name: string) {
    try {
      const res = await this.http.fetch<NexusMavenHostedRepository>(`/service/rest/v1/repositories/maven/hosted/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createRepositoriesMavenHosted(body: NexusMavenHostedRepositoryUpsertRequest) {
    await this.http.fetch('/service/rest/v1/repositories/maven/hosted', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateRepositoriesMavenHosted(name: string, body: NexusMavenHostedRepositoryUpsertRequest) {
    await this.http.fetch(`/service/rest/v1/repositories/maven/hosted/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async createRepositoriesMavenGroup(body: NexusMavenGroupRepositoryUpsertRequest) {
    await this.http.fetch('/service/rest/v1/repositories/maven/group', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateRepositoriesMavenGroup(name: string, body: NexusMavenGroupRepositoryUpsertRequest) {
    await this.http.fetch(`/service/rest/v1/repositories/maven/group/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getRepositoriesMavenGroup(name: string) {
    try {
      const res = await this.http.fetch<NexusMavenGroupRepository>(`/service/rest/v1/repositories/maven/group/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async getRepositoriesNpmHosted(name: string) {
    try {
      const res = await this.http.fetch<NexusNpmHostedRepository>(`/service/rest/v1/repositories/npm/hosted/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createRepositoriesNpmHosted(body: NexusNpmHostedRepositoryUpsertRequest) {
    await this.http.fetch('/service/rest/v1/repositories/npm/hosted', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateRepositoriesNpmHosted(name: string, body: NexusNpmHostedRepositoryUpsertRequest) {
    await this.http.fetch(`/service/rest/v1/repositories/npm/hosted/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getRepositoriesNpmGroup(name: string): Promise<NexusNpmGroupRepository | null> {
    try {
      const res = await this.http.fetch<NexusNpmGroupRepository>(`/service/rest/v1/repositories/npm/group/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async postRepositoriesNpmGroup(body: NexusNpmGroupRepositoryUpsertRequest) {
    await this.http.fetch('/service/rest/v1/repositories/npm/group', { method: 'POST', body })
  }

  @StartActiveSpan()
  async putRepositoriesNpmGroup(name: string, body: NexusNpmGroupRepositoryUpsertRequest) {
    await this.http.fetch(`/service/rest/v1/repositories/npm/group/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getSecurityPrivileges(name: string): Promise<NexusPrivilege | null> {
    try {
      const res = await this.http.fetch<NexusPrivilege>(`/service/rest/v1/security/privileges/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createSecurityPrivilegesRepositoryView(body: NexusRepositoryViewPrivilegeUpsertRequest) {
    await this.http.fetch('/service/rest/v1/security/privileges/repository-view', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateSecurityPrivilegesRepositoryView(name: string, body: NexusRepositoryViewPrivilegeUpsertRequest) {
    await this.http.fetch(`/service/rest/v1/security/privileges/repository-view/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityPrivileges(name: string) {
    try {
      await this.http.fetch(`/service/rest/v1/security/privileges/${name}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async getSecurityRoles(id: string): Promise<NexusRole | null> {
    try {
      const res = await this.http.fetch<NexusRole>(`/service/rest/v1/security/roles/${id}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createSecurityRoles(body: NexusRoleCreateRequest) {
    await this.http.fetch('/service/rest/v1/security/roles', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateSecurityRoles(id: string, body: NexusRoleUpdateRequest) {
    await this.http.fetch(`/service/rest/v1/security/roles/${id}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityRoles(id: string) {
    try {
      await this.http.fetch(`/service/rest/v1/security/roles/${id}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async getSecurityUsers(userId: string): Promise<{ userId: string }[]> {
    const query = new URLSearchParams({ userId }).toString()
    const res = await this.http.fetch<{ userId: string }[]>(`/service/rest/v1/security/users?${query}`)
    return res.data ?? []
  }

  @StartActiveSpan()
  async updateSecurityUsersChangePassword(userId: string, password: string) {
    await this.http.fetch(`/service/rest/v1/security/users/${userId}/change-password`, {
      method: 'PUT',
      body: password,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  @StartActiveSpan()
  async createSecurityUsers(body: NexusUserCreateRequest) {
    await this.http.fetch('/service/rest/v1/security/users', { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSecurityUsers(userId: string) {
    try {
      await this.http.fetch(`/service/rest/v1/security/users/${userId}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async deleteRepositoriesByName(name: string) {
    try {
      await this.http.fetch(`/service/rest/v1/repositories/${name}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }
}
