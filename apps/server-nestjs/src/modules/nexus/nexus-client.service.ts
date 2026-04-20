import type { NexusFetchOptions, NexusResponse } from './nexus-http-client.service'
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

  getProjectSecrets(args: { projectSlug: string, enableMaven: boolean, enableNpm: boolean }) {
    const projectSlug = args.projectSlug
    const nexusUrl = this.config.nexusSecretExposedUrl!
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
  private async fetch<T = unknown>(path: string, options: NexusFetchOptions = {}): Promise<NexusResponse<T>> {
    return this.http.fetch(path, options)
  }

  @StartActiveSpan()
  async getRepositoriesMavenHosted(name: string): Promise<NexusMavenHostedRepository | null> {
    try {
      const res = await this.fetch<NexusMavenHostedRepository>(`/repositories/maven/hosted/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createRepositoriesMavenHosted(body: NexusMavenHostedRepositoryUpsertRequest): Promise<void> {
    await this.fetch('/repositories/maven/hosted', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateRepositoriesMavenHosted(name: string, body: NexusMavenHostedRepositoryUpsertRequest): Promise<void> {
    await this.fetch(`/repositories/maven/hosted/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async createRepositoriesMavenGroup(body: NexusMavenGroupRepositoryUpsertRequest): Promise<void> {
    await this.fetch('/repositories/maven/group', { method: 'POST', body })
  }

  @StartActiveSpan()
  async getRepositoriesMavenGroup(name: string): Promise<NexusMavenGroupRepository | null> {
    try {
      const res = await this.fetch<NexusMavenGroupRepository>(`/repositories/maven/group/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async getRepositoriesNpmHosted(name: string): Promise<NexusNpmHostedRepository | null> {
    try {
      const res = await this.fetch<NexusNpmHostedRepository>(`/repositories/npm/hosted/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createRepositoriesNpmHosted(body: NexusNpmHostedRepositoryUpsertRequest): Promise<void> {
    await this.fetch('/repositories/npm/hosted', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateRepositoriesNpmHosted(name: string, body: NexusNpmHostedRepositoryUpsertRequest): Promise<void> {
    await this.fetch(`/repositories/npm/hosted/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getRepositoriesNpmGroup(name: string): Promise<NexusNpmGroupRepository | null> {
    try {
      const res = await this.fetch<NexusNpmGroupRepository>(`/repositories/npm/group/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async postRepositoriesNpmGroup(body: NexusNpmGroupRepositoryUpsertRequest): Promise<void> {
    await this.fetch('/repositories/npm/group', { method: 'POST', body })
  }

  @StartActiveSpan()
  async putRepositoriesNpmGroup(name: string, body: NexusNpmGroupRepositoryUpsertRequest): Promise<void> {
    await this.fetch(`/repositories/npm/group/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getSecurityPrivileges(name: string): Promise<NexusPrivilege | null> {
    try {
      const res = await this.fetch<NexusPrivilege>(`/security/privileges/${name}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createSecurityPrivilegesRepositoryView(body: NexusRepositoryViewPrivilegeUpsertRequest): Promise<void> {
    await this.fetch('/security/privileges/repository-view', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateSecurityPrivilegesRepositoryView(name: string, body: NexusRepositoryViewPrivilegeUpsertRequest): Promise<void> {
    await this.fetch(`/security/privileges/repository-view/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityPrivileges(name: string): Promise<void> {
    try {
      await this.fetch(`/security/privileges/${name}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async getSecurityRoles(id: string): Promise<NexusRole | null> {
    try {
      const res = await this.fetch<NexusRole>(`/security/roles/${id}`)
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createSecurityRoles(body: NexusRoleCreateRequest): Promise<void> {
    await this.fetch('/security/roles', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateSecurityRoles(id: string, body: NexusRoleUpdateRequest): Promise<void> {
    await this.fetch(`/security/roles/${id}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityRoles(id: string): Promise<void> {
    try {
      await this.fetch(`/security/roles/${id}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async getSecurityUsers(userId: string): Promise<{ userId: string }[]> {
    const query = new URLSearchParams({ userId }).toString()
    const res = await this.fetch<{ userId: string }[]>(`/security/users?${query}`)
    return res.data ?? []
  }

  @StartActiveSpan()
  async updateSecurityUsersChangePassword(userId: string, password: string): Promise<void> {
    await this.fetch(`/security/users/${userId}/change-password`, {
      method: 'PUT',
      body: password,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  @StartActiveSpan()
  async createSecurityUsers(body: NexusUserCreateRequest): Promise<void> {
    await this.fetch('/security/users', { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSecurityUsers(userId: string): Promise<void> {
    try {
      await this.fetch(`/security/users/${userId}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async deleteRepositoriesByName(name: string): Promise<void> {
    try {
      await this.fetch(`/repositories/${name}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }
}
