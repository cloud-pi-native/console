import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { NexusHttpClientService } from './nexus-http-client.service'
import { isNexusNotFound } from './nexus.utils'

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

export interface NexusMavenHostedRepository {
  name: string
  online: boolean
  storage: NexusRepositoryStorage & { writePolicy: string }
  cleanup?: NexusRepositoryCleanup
  component: NexusRepositoryComponent
  maven: {
    versionPolicy: string
    layoutPolicy: string
    contentDisposition: string
  }
}

interface NexusMavenHostedRepositoryUpsertRequest extends NexusMavenHostedRepository {}

export interface NexusMavenGroupRepository {
  name: string
  online: boolean
  storage: Omit<NexusRepositoryStorage, 'writePolicy'>
  group: NexusRepositoryGroup
}

interface NexusMavenGroupRepositoryUpsertRequest extends NexusMavenGroupRepository {}

export interface NexusNpmHostedRepository {
  name: string
  online: boolean
  storage: NexusRepositoryStorage & { writePolicy: string }
  cleanup?: NexusRepositoryCleanup
  component: NexusRepositoryComponent
}

interface NexusNpmHostedRepositoryUpsertRequest extends NexusNpmHostedRepository {}

export interface NexusNpmGroupRepository {
  name: string
  online: boolean
  storage: Omit<NexusRepositoryStorage, 'writePolicy'>
  group: NexusRepositoryGroup
}

interface NexusNpmGroupRepositoryUpsertRequest extends NexusNpmGroupRepository {}

interface NexusRepositoryViewPrivilege {
  name: string
  description: string
  actions: string[]
  format: string
  repository: string
}

interface NexusRepositoryViewPrivilegeUpsertRequest extends NexusRepositoryViewPrivilege {}

interface NexusRole {
  id: string
  name: string
  privileges: string[]
  source?: string
  roles?: string[]
  description?: string
}

interface NexusRoleCreateRequest extends NexusRole {
  description: string
}

interface NexusRoleUpdateRequest extends NexusRole {}

interface NexusUserCreateRequest {
  userId: string
  firstName: string
  lastName: string
  emailAddress: string
  password: string
  status: string
  roles: string[]
}

export interface NexusPrivilege extends NexusRepositoryViewPrivilege {
  type: string
}

@Injectable()
export class NexusClientService {
  constructor(
    @Inject(NexusHttpClientService) private readonly http: NexusHttpClientService,
  ) {}

  @StartActiveSpan()
  async getRepositoriesMavenHosted(name: string) {
    try {
      const res = await this.http.fetch<NexusMavenHostedRepository>(`repositories/maven/hosted/${name}`)
      return res.data
    } catch (error) {
      if (isNexusNotFound(error)) return null
      throw error
    }
  }

  @StartActiveSpan()
  async ensureRepositoriesMavenHosted(body: NexusMavenHostedRepositoryUpsertRequest): Promise<NexusMavenHostedRepository | undefined> {
    try {
      await this.http.fetch('repositories/maven/hosted', { method: 'POST', body })
      return undefined
    } catch (error) {
      if (!this.isAlreadyExistsError(error)) throw error
      return await this.getRepositoriesMavenHosted(body.name) ?? undefined
    }
  }

  @StartActiveSpan()
  async updateRepositoriesMavenHosted(name: string, body: NexusMavenHostedRepositoryUpsertRequest) {
    await this.http.fetch(`repositories/maven/hosted/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async ensureRepositoriesMavenGroup(body: NexusMavenGroupRepositoryUpsertRequest): Promise<NexusMavenGroupRepository | undefined> {
    try {
      await this.http.fetch('repositories/maven/group', { method: 'POST', body })
      return undefined
    } catch (error) {
      if (!this.isAlreadyExistsError(error)) throw error
      return await this.getRepositoriesMavenGroup(body.name) ?? undefined
    }
  }

  @StartActiveSpan()
  async updateRepositoriesMavenGroup(name: string, body: NexusMavenGroupRepositoryUpsertRequest) {
    await this.http.fetch(`repositories/maven/group/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getRepositoriesMavenGroup(name: string) {
    try {
      const res = await this.http.fetch<NexusMavenGroupRepository>(`repositories/maven/group/${name}`)
      return res.data
    } catch (error) {
      if (isNexusNotFound(error)) return null
      throw error
    }
  }

  @StartActiveSpan()
  async getRepositoriesNpmHosted(name: string) {
    try {
      const res = await this.http.fetch<NexusNpmHostedRepository>(`repositories/npm/hosted/${name}`)
      return res.data
    } catch (error) {
      if (isNexusNotFound(error)) return null
      throw error
    }
  }

  @StartActiveSpan()
  async ensureRepositoriesNpmHosted(body: NexusNpmHostedRepositoryUpsertRequest): Promise<NexusNpmHostedRepository | undefined> {
    try {
      await this.http.fetch('repositories/npm/hosted', { method: 'POST', body })
      return undefined
    } catch (error) {
      if (!this.isAlreadyExistsError(error)) throw error
      return await this.getRepositoriesNpmHosted(body.name) ?? undefined
    }
  }

  @StartActiveSpan()
  async updateRepositoriesNpmHosted(name: string, body: NexusNpmHostedRepositoryUpsertRequest) {
    await this.http.fetch(`repositories/npm/hosted/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getRepositoriesNpmGroup(name: string): Promise<NexusNpmGroupRepository | null> {
    try {
      const res = await this.http.fetch<NexusNpmGroupRepository>(`repositories/npm/group/${name}`)
      return res.data
    } catch (error) {
      if (isNexusNotFound(error)) return null
      throw error
    }
  }

  @StartActiveSpan()
  async ensureRepositoriesNpmGroup(body: NexusNpmGroupRepositoryUpsertRequest): Promise<NexusNpmGroupRepository | undefined> {
    try {
      await this.http.fetch('repositories/npm/group', { method: 'POST', body })
      return undefined
    } catch (error) {
      if (!this.isAlreadyExistsError(error)) throw error
      return await this.getRepositoriesNpmGroup(body.name) ?? undefined
    }
  }

  @StartActiveSpan()
  async putRepositoriesNpmGroup(name: string, body: NexusNpmGroupRepositoryUpsertRequest) {
    await this.http.fetch(`repositories/npm/group/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getSecurityPrivileges(name: string): Promise<NexusPrivilege | null> {
    try {
      const res = await this.http.fetch<NexusPrivilege>(`security/privileges/${name}`)
      return res.data
    } catch (error) {
      if (isNexusNotFound(error)) return null
      throw error
    }
  }

  @StartActiveSpan()
  async ensureSecurityPrivilegesRepositoryView(body: NexusRepositoryViewPrivilegeUpsertRequest): Promise<NexusPrivilege | undefined> {
    try {
      await this.http.fetch('security/privileges/repository-view', { method: 'POST', body })
      return undefined
    } catch (error) {
      if (!this.isAlreadyExistsError(error)) throw error
      return await this.getSecurityPrivileges(body.name) ?? undefined
    }
  }

  @StartActiveSpan()
  async updateSecurityPrivilegesRepositoryView(name: string, body: NexusRepositoryViewPrivilegeUpsertRequest) {
    await this.http.fetch(`security/privileges/repository-view/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityPrivileges(name: string) {
    try {
      await this.http.fetch(`security/privileges/${name}`, { method: 'DELETE' })
    } catch (error) {
      if (isNexusNotFound(error)) return
      throw error
    }
  }

  @StartActiveSpan()
  async getSecurityRoles(id: string): Promise<NexusRole | null> {
    try {
      const res = await this.http.fetch<NexusRole>(`security/roles/${id}`)
      return res.data
    } catch (error) {
      if (isNexusNotFound(error)) return null
      throw error
    }
  }

  @StartActiveSpan()
  async ensureSecurityRoles(body: NexusRoleCreateRequest): Promise<NexusRole | undefined> {
    try {
      await this.http.fetch('security/roles', { method: 'POST', body })
      return undefined
    } catch (error) {
      if (!this.isAlreadyExistsError(error)) throw error
      return await this.getSecurityRoles(body.id) ?? undefined
    }
  }

  @StartActiveSpan()
  async updateSecurityRoles(id: string, body: NexusRoleUpdateRequest) {
    await this.http.fetch(`security/roles/${id}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityRoles(id: string) {
    try {
      await this.http.fetch(`security/roles/${id}`, { method: 'DELETE' })
    } catch (error) {
      if (isNexusNotFound(error)) return
      throw error
    }
  }

  @StartActiveSpan()
  async getSecurityUsers(userId: string): Promise<{ userId: string }[]> {
    const query = new URLSearchParams({ userId }).toString()
    const res = await this.http.fetch<{ userId: string }[]>(`security/users?${query}`)
    return res.data ?? []
  }

  @StartActiveSpan()
  async updateSecurityUsersChangePassword(userId: string, password: string) {
    await this.http.fetch(`security/users/${userId}/change-password`, {
      method: 'PUT',
      body: password,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  @StartActiveSpan()
  async ensureSecurityUsers(body: NexusUserCreateRequest): Promise<{ userId: string } | undefined> {
    try {
      await this.http.fetch('security/users', { method: 'POST', body })
      return undefined
    } catch (error) {
      if (!this.isAlreadyExistsError(error)) throw error
      const users = await this.getSecurityUsers(body.userId)
      return users.find(user => user.userId === body.userId)
    }
  }

  @StartActiveSpan()
  async deleteSecurityUsers(userId: string) {
    try {
      await this.http.fetch(`security/users/${userId}`, { method: 'DELETE' })
    } catch (error) {
      if (isNexusNotFound(error)) return
      throw error
    }
  }

  @StartActiveSpan()
  async deleteRepositoriesByName(name: string) {
    try {
      await this.http.fetch(`repositories/${name}`, { method: 'DELETE' })
    } catch (error) {
      if (isNexusNotFound(error)) return
      throw error
    }
  }

  /**
   * A concurrent reconciliation may have created the resource between the
   * caller's GET and this POST; treat that collision as "already exists" and
   * let the caller reconcile via its update branch instead of failing the sync.
   */
  private isAlreadyExistsError(error: unknown): error is NexusError {
    if (!(error instanceof NexusError)) return false
    if (error.status === HttpStatus.CONFLICT) return true
    return error.status !== undefined && error.status >= 400 && error.status < 500 && /already|exists/i.test(error.message)
  }
}
