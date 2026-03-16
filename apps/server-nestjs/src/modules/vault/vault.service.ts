import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService, VaultError } from './vault-client.service'
import type { VaultSecret } from './vault-client.service'
import { trace } from '@opentelemetry/api'
import {
  generateAppAdminPolicyName,
  generateTechReadOnlyPolicyName,
  generateZoneName,
  generateZoneTechReadOnlyPolicyName,
} from './vault.utils'
import type { ProjectWithDetails } from './vault-datastore.service'

const tracer = trace.getTracer('vault-service')

@Injectable()
export class VaultService {
  constructor(
    @Inject(VaultClientService) private readonly vaultClientService: VaultClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  private getApproleRoleBody(policies: string[]) {
    return {
      secret_id_num_uses: '0',
      secret_id_ttl: '0',
      token_max_ttl: '0',
      token_num_uses: '0',
      token_ttl: '0',
      token_type: 'batch',
      token_policies: policies,
    }
  }

  async read(path: string): Promise<VaultSecret> {
    return tracer.startActiveSpan('read', async (span) => {
      try {
        span.setAttribute('vault.path', path)
        return await this.vaultClientService.getKvData(this.config.vaultKvName, path)
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async write(data: any, path: string): Promise<void> {
    return tracer.startActiveSpan('write', async (span) => {
      try {
        span.setAttribute('vault.path', path)
        await this.vaultClientService.upsertKvData(this.config.vaultKvName, path, { data })
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async destroy(path: string): Promise<void> {
    return tracer.startActiveSpan('destroy', async (span) => {
      try {
        span.setAttribute('vault.path', path)
        await this.vaultClientService.destroy(path)
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async readProjectValues(projectId: string): Promise<Record<string, any>> {
    return tracer.startActiveSpan('readProjectValues', async (span) => {
      const path = this.config.projectRootPath
        ? `${this.config.projectRootPath}/${projectId}`
        : projectId
      try {
        span.setAttribute('vault.path', path)
        const secret = await this.vaultClientService.getKvData(this.config.vaultKvName, path)
        return secret.data || {}
      } catch (error) {
        if (error instanceof VaultError && error.kind === 'NotFound') return {}
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async readGitlabMirrorCreds(projectSlug: string, repoName: string) {
    return tracer.startActiveSpan('readGitlabMirrorCreds', async (span) => {
      const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
      try {
        span.setAttribute('vault.path', vaultCredsPath)
        span.setAttribute('project.slug', projectSlug)
        span.setAttribute('repo.name', repoName)
        return await this.read(vaultCredsPath)
      } catch (error) {
        if (error instanceof VaultError && error.kind === 'NotFound') return null
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async writeGitlabMirrorCreds(projectSlug: string, repoName: string, data: Record<string, any>) {
    return tracer.startActiveSpan('writeGitlabMirrorCreds', async (span) => {
      const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
      try {
        span.setAttribute('vault.path', vaultCredsPath)
        span.setAttribute('project.slug', projectSlug)
        span.setAttribute('repo.name', repoName)
        await this.write(data, vaultCredsPath)
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async deleteGitlabMirrorCreds(projectSlug: string, repoName: string) {
    return tracer.startActiveSpan('deleteGitlabMirrorCreds', async (span) => {
      const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
      try {
        span.setAttribute('vault.path', vaultCredsPath)
        span.setAttribute('project.slug', projectSlug)
        span.setAttribute('repo.name', repoName)
        try {
          await this.destroy(vaultCredsPath)
        } catch (error) {
          if (error instanceof VaultError && error.kind === 'NotFound') return
          throw error
        }
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async readTechnReadOnlyCreds(projectSlug: string) {
    return tracer.startActiveSpan('readMirrorCreds', async (span) => {
      const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
      try {
        span.setAttribute('vault.path', vaultPath)
        span.setAttribute('project.slug', projectSlug)
        return await this.read(vaultPath)
      } catch (error) {
        if (error instanceof VaultError && error.kind === 'NotFound') return null
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async writeTechReadOnlyCreds(projectSlug: string, creds: Record<string, any>) {
    return tracer.startActiveSpan('writeMirrorCreds', async (span) => {
      const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
      try {
        span.setAttribute('vault.path', vaultPath)
        span.setAttribute('project.slug', projectSlug)
        await this.write(creds, vaultPath)
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async writeMirrorTriggerToken(secret: Record<string, any>) {
    return tracer.startActiveSpan('writeMirrorTriggerToken', async (span) => {
      try {
        span.setAttribute('vault.path', 'GITLAB')
        await this.write(secret, 'GITLAB')
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  private async upsertMount(kvName: string): Promise<void> {
    const createBody = {
      type: 'kv',
      config: {
        force_no_cache: true,
      },
      options: {
        version: 2,
      },
    }
    const tuneBody = {
      options: {
        version: 2,
      },
    }
    try {
      await this.vaultClientService.createSysMount(kvName, createBody)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'HttpError' && error.status === 400) {
        await this.vaultClientService.tuneSysMount(kvName, tuneBody)
        return
      }
      throw error
    }
  }

  private async deleteMount(kvName: string): Promise<void> {
    try {
      await this.vaultClientService.deleteSysMounts(kvName)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    }
  }

  async upsertZone(zoneName: string): Promise<void> {
    return tracer.startActiveSpan('upsertZone', async (span) => {
      const kvName = generateZoneName(zoneName)
      const policyName = generateZoneTechReadOnlyPolicyName(zoneName)
      const roleName = kvName

      try {
        span.setAttribute('zone.name', zoneName)
        span.setAttribute('vault.kvName', kvName)

        await this.upsertMount(kvName)
        await this.vaultClientService.upsertSysPoliciesAcl(policyName, {
          policy: `path "${kvName}/*" { capabilities = ["read"] }`,
        })
        await this.vaultClientService.upsertAuthApproleRole(roleName, this.getApproleRoleBody([policyName]))
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async deleteZone(zoneName: string): Promise<void> {
    return tracer.startActiveSpan('deleteZone', async (span) => {
      const kvName = generateZoneName(zoneName)
      const policyName = generateZoneTechReadOnlyPolicyName(zoneName)
      const roleName = kvName

      try {
        span.setAttribute('zone.name', zoneName)
        span.setAttribute('vault.kvName', kvName)
        await this.deleteMount(kvName)
        const settled = await Promise.allSettled([
          this.vaultClientService.deleteSysPoliciesAcl(policyName),
          this.vaultClientService.deleteAuthApproleRole(roleName),
        ])

        for (const result of settled) {
          if (result.status !== 'rejected') continue
          const error = result.reason
          if (error instanceof VaultError && error.kind === 'NotFound') continue
          throw error
        }
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async upsertProject(project: ProjectWithDetails): Promise<void> {
    return tracer.startActiveSpan('upsertProject', async (span) => {
      const appPolicyName = generateAppAdminPolicyName(project)
      const techPolicyName = generateTechReadOnlyPolicyName(project)

      try {
        span.setAttribute('project.slug', project.slug)
        await this.upsertMount(project.slug)
        await Promise.all([
          this.createAppAdminPolicy(appPolicyName, project.slug),
          this.createTechReadOnlyPolicy(techPolicyName, project.slug),
          this.ensureProjectGroup(project.slug, appPolicyName),
          this.vaultClientService.upsertAuthApproleRole(project.slug, this.getApproleRoleBody([techPolicyName, appPolicyName])),
        ])
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  async deleteProject(projectSlug: string): Promise<void> {
    return tracer.startActiveSpan('deleteProject', async (span) => {
      const kvName = projectSlug
      const appPolicyName = generateAppAdminPolicyName({ slug: projectSlug } as ProjectWithDetails)
      const techPolicyName = generateTechReadOnlyPolicyName({ slug: projectSlug } as ProjectWithDetails)
      const roleName = projectSlug
      const groupName = projectSlug

      try {
        span.setAttribute('project.slug', projectSlug)
        span.setAttribute('vault.kvName', kvName)

        await this.deleteMount(kvName)

        const settled = await Promise.allSettled([
          this.vaultClientService.deleteSysPoliciesAcl(appPolicyName),
          this.vaultClientService.deleteSysPoliciesAcl(techPolicyName),
          this.vaultClientService.deleteAuthApproleRole(roleName),
          this.vaultClientService.deleteIdentityGroupName(groupName),
        ])
        for (const result of settled) {
          if (result.status !== 'rejected') continue
          const error = result.reason
          if (error instanceof VaultError && error.kind === 'NotFound') continue
          throw error
        }
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  private async ensureProjectGroup(groupName: string, policyName: string): Promise<void> {
    await this.vaultClientService.upsertIdentityGroupName(groupName, {
      name: groupName,
      type: 'external',
      policies: [policyName],
    })

    const groupResult = await this.vaultClientService.getIdentityGroupName(groupName)
    if (!groupResult.data?.id) {
      throw new VaultError('InvalidResponse', `Vault group not found after upsert: ${groupName}`, { method: 'GET', path: `/v1/identity/group/name/${groupName}` })
    }

    const groupAliasName = `/${groupName}`
    if (groupResult.data.alias?.name === groupAliasName) return

    const methods = await this.vaultClientService.getSysAuth()
    const oidc = methods['oidc/']
    if (!oidc?.accessor) {
      throw new VaultError('InvalidResponse', 'Vault OIDC auth method not found (expected "oidc/")', { method: 'GET', path: '/v1/sys/auth' })
    }
    try {
      await this.vaultClientService.createIdentityGroupAlias({
        name: groupAliasName,
        mount_accessor: oidc.accessor,
        canonical_id: groupResult.data.id,
      })
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'HttpError' && error.status === 400) return
      throw error
    }
  }

  async createAppAdminPolicy(name: string, projectSlug: string): Promise<void> {
    await this.vaultClientService.upsertSysPoliciesAcl(name, {
      policy: `path "${projectSlug}/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
    })
  }

  async createTechReadOnlyPolicy(name: string, projectSlug: string): Promise<void> {
    await this.vaultClientService.upsertSysPoliciesAcl(name, {
      policy: `path "${this.config.vaultKvName}/data/${projectSlug}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
    })
  }

  async listProjectSecrets(projectSlug: string): Promise<string[]> {
    const projectPath = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectSlug}`
      : projectSlug
    return this.listRecursive(this.config.vaultKvName, projectPath, '')
  }

  async destroyProjectSecrets(projectSlug: string): Promise<void> {
    return tracer.startActiveSpan('destroyProjectSecrets', async (span) => {
      try {
        span.setAttribute('project.slug', projectSlug)
        const secrets = await this.listProjectSecrets(projectSlug)

        await Promise.allSettled(secrets.map(async (relativePath) => {
          const fullPath = this.config.projectRootPath
            ? `${this.config.projectRootPath}/${projectSlug}/${relativePath}`
            : `${projectSlug}/${relativePath}`
          try {
            await this.destroy(fullPath)
          } catch (error) {
            if (error instanceof VaultError && error.kind === 'NotFound') return
            throw error
          }
        }))
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  private async listRecursive(
    kvName: string,
    basePath: string,
    relativePath: string,
  ): Promise<string[]> {
    const combined = relativePath.length === 0 ? basePath : `${basePath}/${relativePath}`
    const keys = await this.vaultClientService.listKvMetadata(kvName, combined)
    if (keys.length === 0) return []

    const results: string[] = []
    for (const key of keys) {
      if (key.endsWith('/')) {
        const nestedRel = relativePath.length === 0 ? key.slice(0, -1) : `${relativePath}/${key.slice(0, -1)}`
        const nested = await this.listRecursive(kvName, basePath, nestedRel)
        results.push(...nested)
      } else {
        results.push(relativePath.length === 0 ? key : `${relativePath}/${key}`)
      }
    }
    return results
  }
}
