import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import type { VaultError, VaultResult, VaultSecret } from './vault-client.service'
import { trace } from '@opentelemetry/api'
import {
  generateAppAdminPolicyName,
  generateTechnicalReadOnlyPolicyName,
  generateZoneName,
  generateZoneTechnicalReadOnlyPolicyName,
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

  async read(path: string): Promise<VaultResult<VaultSecret>> {
    return tracer.startActiveSpan('read', async (span) => {
      try {
        span.setAttribute('vault.path', path)
        return await this.vaultClientService.read(path)
      } finally {
        span.end()
      }
    })
  }

  async write(data: any, path: string): Promise<VaultResult<void>> {
    return tracer.startActiveSpan('write', async (span) => {
      try {
        span.setAttribute('vault.path', path)
        return await this.vaultClientService.write(data, path)
      } finally {
        span.end()
      }
    })
  }

  async destroy(path: string): Promise<VaultResult<void>> {
    return tracer.startActiveSpan('destroy', async (span) => {
      try {
        span.setAttribute('vault.path', path)
        return await this.vaultClientService.destroy(path)
      } finally {
        span.end()
      }
    })
  }

  async readProjectValues(projectId: string): Promise<VaultResult<Record<string, any>>> {
    return tracer.startActiveSpan('readProjectValues', async (span) => {
      const path = this.config.projectRootPath
        ? `${this.config.projectRootPath}/${projectId}`
        : projectId
      try {
        span.setAttribute('vault.path', path)
        const secret = await this.vaultClientService.read(path)
        if (secret.error) {
          if (secret.error.kind === 'NotFound') return { data: {}, error: null }
          return { data: null, error: secret.error }
        }
        return { data: secret.data.data || {}, error: null }
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
        return await this.write(data, vaultCredsPath)
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
        const result = await this.destroy(vaultCredsPath)
        if (result.error?.kind === 'NotFound') return { data: undefined, error: null }
        return result
      } finally {
        span.end()
      }
    })
  }

  async readMirrorCreds(projectSlug: string) {
    return tracer.startActiveSpan('readMirrorCreds', async (span) => {
      const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
      try {
        span.setAttribute('vault.path', vaultPath)
        span.setAttribute('project.slug', projectSlug)
        return await this.read(vaultPath)
      } finally {
        span.end()
      }
    })
  }

  async writeMirrorCreds(projectSlug: string, creds: Record<string, any>) {
    return tracer.startActiveSpan('writeMirrorCreds', async (span) => {
      const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
      try {
        span.setAttribute('vault.path', vaultPath)
        span.setAttribute('project.slug', projectSlug)
        return await this.write(creds, vaultPath)
      } finally {
        span.end()
      }
    })
  }

  async writeMirrorTriggerToken(secret: Record<string, any>) {
    return tracer.startActiveSpan('writeMirrorTriggerToken', async (span) => {
      try {
        span.setAttribute('vault.path', 'GITLAB')
        return await this.write(secret, 'GITLAB')
      } finally {
        span.end()
      }
    })
  }

  private async upsertMount(kvName: string): Promise<VaultResult<void>> {
    const body = {
      type: 'kv',
      config: {
        force_no_cache: true,
      },
      options: {
        version: 2,
      },
    }
    const created = await this.vaultClientService.createMount(kvName, body)
    if (!created.error) return { data: undefined, error: null }
    if (created.error.kind === 'HttpError' && created.error.status === 400) {
      return await this.vaultClientService.updateMount(kvName, body)
    }
    return { data: null, error: created.error }
  }

  private async deleteMount(kvName: string): Promise<VaultResult<void>> {
    return await this.vaultClientService.deleteMount(kvName)
  }

  async upsertZone(zoneName: string): Promise<VaultResult<void>> {
    return tracer.startActiveSpan('upsertZone', async (span) => {
      const kvName = generateZoneName(zoneName)
      const policyName = generateZoneTechnicalReadOnlyPolicyName(zoneName)
      const roleName = kvName

      try {
        span.setAttribute('zone.name', zoneName)
        span.setAttribute('vault.kvName', kvName)

        const mounted = await this.upsertMount(kvName)
        if (mounted.error) return mounted
        const policy = await this.vaultClientService.upsertPolicyAcl(policyName, {
          policy: `path "${kvName}/*" { capabilities = ["read"] }`,
        })
        if (policy.error) return { data: null, error: policy.error }

        const role = await this.vaultClientService.upsertRole(roleName, [policyName])
        if (role.error) return { data: null, error: role.error }

        return { data: undefined, error: null }
      } finally {
        span.end()
      }
    })
  }

  async deleteZone(zoneName: string): Promise<VaultResult<void>> {
    return tracer.startActiveSpan('deleteZone', async (span) => {
      const kvName = generateZoneName(zoneName)
      const policyName = generateZoneTechnicalReadOnlyPolicyName(zoneName)
      const roleName = kvName

      try {
        span.setAttribute('zone.name', zoneName)
        span.setAttribute('vault.kvName', kvName)
        await Promise.allSettled([
          this.deleteMount(kvName),
          this.vaultClientService.deletePolicyAcl(policyName),
          this.vaultClientService.deleteRole(roleName),
        ])
        return { data: undefined, error: null }
      } finally {
        span.end()
      }
    })
  }

  async upsertProject(project: ProjectWithDetails): Promise<VaultResult<void>> {
    return tracer.startActiveSpan('upsertProject', async (span) => {
      const kvName = project.slug
      const appPolicyName = generateAppAdminPolicyName(project)
      const techPolicyName = generateTechnicalReadOnlyPolicyName(project)
      const roleName = project.slug
      const groupName = project.slug

      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('vault.kvName', kvName)

        const mounted = await this.upsertMount(kvName)
        if (mounted.error) return mounted

        const [appPolicy, techPolicy, group, role] = await Promise.all([
          this.createAppAdminPolicy(appPolicyName, project.slug),
          this.createTechnicalReadOnlyPolicy(techPolicyName, project.slug),
          this.ensureProjectGroup(groupName, appPolicyName),
          this.vaultClientService.upsertRole(roleName, [techPolicyName, appPolicyName]),
        ])

        if (appPolicy.error) return { data: null, error: appPolicy.error }
        if (techPolicy.error) return { data: null, error: techPolicy.error }
        if (group.error) return { data: null, error: group.error }
        if (role.error) return { data: null, error: role.error }

        return { data: undefined, error: null }
      } finally {
        span.end()
      }
    })
  }

  async deleteProject(projectSlug: string): Promise<VaultResult<void>> {
    return tracer.startActiveSpan('deleteProject', async (span) => {
      const kvName = projectSlug
      const appPolicyName = generateAppAdminPolicyName({ slug: projectSlug } as ProjectWithDetails)
      const techPolicyName = generateTechnicalReadOnlyPolicyName({ slug: projectSlug } as ProjectWithDetails)
      const roleName = projectSlug
      const groupName = projectSlug

      try {
        span.setAttribute('project.slug', projectSlug)
        span.setAttribute('vault.kvName', kvName)

        const mountDeleted = await this.deleteMount(kvName)
        if (mountDeleted.error?.kind === 'NotConfigured') return { data: null, error: mountDeleted.error }

        await Promise.allSettled([
          this.vaultClientService.deletePolicyAcl(appPolicyName),
          this.vaultClientService.deletePolicyAcl(techPolicyName),
          this.vaultClientService.deleteRole(roleName),
          this.vaultClientService.deleteIdentityGroup(groupName),
        ])
        return { data: undefined, error: null }
      } finally {
        span.end()
      }
    })
  }

  private async ensureProjectGroup(groupName: string, policyName: string): Promise<VaultResult<void>> {
    const upserted = await this.vaultClientService.upsertIdentityGroup(groupName, [policyName])
    if (upserted.error) return { data: null, error: upserted.error }

    const group = await this.vaultClientService.getIdentityGroup(groupName)
    if (group.error) return { data: null, error: group.error }
    if (!group.data?.data?.id) {
      const error: VaultError = {
        kind: 'InvalidResponse',
        message: `Vault group not found after upsert: ${groupName}`,
        method: 'GET',
        path: `/v1/identity/group/name/${groupName}`,
      }
      return { data: null, error }
    }

    const groupAliasName = `/${groupName}`
    if (group.data.data.alias?.name === groupAliasName) return { data: undefined, error: null }

    const methods = await this.vaultClientService.getAuthMethods()
    if (methods.error) return { data: null, error: methods.error }
    const oidc = methods.data['oidc/']
    if (!oidc?.accessor) {
      const error: VaultError = {
        kind: 'InvalidResponse',
        message: 'Vault OIDC auth method not found (expected "oidc/")',
        method: 'GET',
        path: '/v1/sys/auth',
      }
      return { data: null, error }
    }
    return await this.vaultClientService.createGroupAlias(groupAliasName, oidc.accessor, group.data.data.id)
  }

  async createAppAdminPolicy(name: string, projectSlug: string): Promise<VaultResult<void>> {
    return await this.vaultClientService.upsertPolicyAcl(
      name,
      {
        policy: `path "${projectSlug}/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
      },
    )
  }

  async createTechnicalReadOnlyPolicy(name: string, projectSlug: string): Promise<VaultResult<void>> {
    const projectPath = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectSlug}`
      : projectSlug

    return await this.vaultClientService.upsertPolicyAcl(
      name,
      {
        policy: `path "${this.config.vaultKvName}/data/${projectPath}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
      },
    )
  }

  async listProjectSecrets(projectSlug: string): Promise<VaultResult<string[]>> {
    const projectPath = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectSlug}`
      : projectSlug
    return this.listRecursive(this.config.vaultKvName, projectPath, '')
  }

  async destroyProjectSecrets(projectSlug: string): Promise<VaultResult<void>> {
    return tracer.startActiveSpan('destroyProjectSecrets', async (span) => {
      try {
        span.setAttribute('project.slug', projectSlug)
        const secrets = await this.listProjectSecrets(projectSlug)
        if (secrets.error) return { data: null, error: secrets.error }

        await Promise.allSettled(secrets.data.map(async (relativePath) => {
          const fullPath = this.config.projectRootPath
            ? `${this.config.projectRootPath}/${projectSlug}/${relativePath}`
            : `${projectSlug}/${relativePath}`
          const destroyed = await this.destroy(fullPath)
          if (destroyed.error && destroyed.error.kind !== 'NotFound') return destroyed
        }))
        return { data: undefined, error: null }
      } finally {
        span.end()
      }
    })
  }

  private async listRecursive(
    kvName: string,
    basePath: string,
    relativePath: string,
  ): Promise<VaultResult<string[]>> {
    const combined = relativePath.length === 0 ? basePath : `${basePath}/${relativePath}`
    const keys = await this.vaultClientService.listInKv(kvName, combined)
    if (keys.error) return keys
    if (keys.data.length === 0) return { data: [], error: null }

    const results: string[] = []
    for (const key of keys.data) {
      if (key.endsWith('/')) {
        const nestedRel = relativePath.length === 0 ? key.slice(0, -1) : `${relativePath}/${key.slice(0, -1)}`
        const nested = await this.listRecursive(kvName, basePath, nestedRel)
        if (nested.error) return nested
        results.push(...nested.data)
      } else {
        results.push(relativePath.length === 0 ? key : `${relativePath}/${key}`)
      }
    }
    return { data: results, error: null }
  }
}
