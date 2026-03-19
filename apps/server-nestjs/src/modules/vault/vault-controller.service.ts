import { VaultDatastoreService, type ProjectWithDetails, type ZoneWithDetails } from './vault-datastore.service'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { VaultClientService, VaultError } from './vault-client.service'
import { generateProjectPath } from './vault.utils'

@Injectable()
export class VaultControllerService {
  private readonly logger = new Logger(VaultControllerService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(VaultDatastoreService) private readonly vaultDatastore: VaultDatastoreService,
    @Inject(VaultClientService) private readonly client: VaultClientService,
  ) {
    this.logger.log('VaultControllerService initialized')
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
    await Promise.all([
      this.deleteProject(project.slug),
      this.deleteProjectSecrets(project.slug),
    ])
  }

  @OnEvent('zone.upsert')
  @StartActiveSpan()
  async handleUpsertZone(zone: ZoneWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('zone.slug', zone.slug)
    this.logger.log(`Handling zone upsert for ${zone.slug}`)
    await this.ensureZone(zone)
  }

  @OnEvent('zone.delete')
  @StartActiveSpan()
  async handleDeleteZone(zone: ZoneWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('zone.slug', zone.slug)
    this.logger.log(`Handling zone delete for ${zone.slug}`)
    await this.deleteZone(zone.slug)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    const span = trace.getActiveSpan()
    this.logger.log('Starting Vault reconciliation')
    const [projects, zones] = await Promise.all([
      this.vaultDatastore.getAllProjects(),
      this.vaultDatastore.getAllZones(),
    ])

    span?.setAttributes({
      'vault.projects.count': projects.length,
      'vault.zones.count': zones.length,
    })
    await Promise.all([
      this.ensureProjects(projects),
      this.ensureZones(zones),
    ])
  }

  @StartActiveSpan()
  private async ensureProjects(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.projects.count', projects.length)
    await Promise.all(projects.map(p => this.ensureProject(p)))
  }

  @StartActiveSpan()
  private async ensureProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    await this.upsertProject(project)
  }

  @StartActiveSpan()
  private async ensureZones(zones: ZoneWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.zones.count', zones.length)
    await Promise.all(zones.map(z => this.ensureZone(z)))
  }

  @StartActiveSpan()
  private async ensureZone(zone: ZoneWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('zone.slug', zone.slug)
    await this.upsertZone(zone.slug)
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
      await this.client.createSysMount(kvName, createBody)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'HttpError' && error.status === 400) {
        await this.client.tuneSysMount(kvName, tuneBody)
        return
      }
      throw error
    }
  }

  private async deleteMount(kvName: string): Promise<void> {
    try {
      await this.client.deleteSysMounts(kvName)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    }
  }

  @StartActiveSpan()
  async upsertZone(zoneName: string): Promise<void> {
    const kvName = generateZoneName(zoneName)
    const span = trace.getActiveSpan()
    span?.setAttribute('zone.name', zoneName)
    span?.setAttribute('vault.kv.name', kvName)
    const policyName = generateZoneTechReadOnlyPolicyName(zoneName)

    await this.upsertMount(kvName)
    await this.client.upsertSysPoliciesAcl(policyName, {
      policy: `path "${kvName}/*" { capabilities = ["read"] }`,
    })
    await this.client.upsertAuthApproleRole(kvName, generateApproleRoleBody([policyName]))
  }

  @StartActiveSpan()
  async deleteZone(zoneName: string): Promise<void> {
    const kvName = generateZoneName(zoneName)
    const span = trace.getActiveSpan()
    span?.setAttribute('zone.name', zoneName)
    span?.setAttribute('vault.kv.name', kvName)
    const policyName = generateZoneTechReadOnlyPolicyName(zoneName)
    const roleName = kvName

    await this.deleteMount(kvName)

    const settled = await Promise.allSettled([
      this.client.deleteSysPoliciesAcl(policyName),
      this.client.deleteAuthApproleRole(roleName),
    ])

    for (const result of settled) {
      if (result.status !== 'rejected') continue
      const error = result.reason
      if (error instanceof VaultError && error.kind === 'NotFound') continue
      throw error
    }
  }

  @StartActiveSpan()
  async upsertProject(project: ProjectWithDetails): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('vault.kv.name', project.slug)
    const appPolicyName = generateAppAdminPolicyName(project)
    const techPolicyName = generateTechReadOnlyPolicyName(project)
    await this.upsertMount(project.slug)
    await Promise.all([
      this.createAppAdminPolicy(appPolicyName, project.slug),
      this.createTechReadOnlyPolicy(techPolicyName, project.slug),
      this.ensureProjectGroup(project.slug, appPolicyName),
      this.client.upsertAuthApproleRole(project.slug, generateApproleRoleBody([techPolicyName, appPolicyName])),
    ])
  }

  @StartActiveSpan()
  async deleteProject(projectSlug: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kv.name', projectSlug)
    const appPolicyName = generateAppAdminPolicyName({ slug: projectSlug } as ProjectWithDetails)
    const techPolicyName = generateTechReadOnlyPolicyName({ slug: projectSlug } as ProjectWithDetails)

    await this.deleteMount(projectSlug)

    const settled = await Promise.allSettled([
      this.client.deleteSysPoliciesAcl(appPolicyName),
      this.client.deleteSysPoliciesAcl(techPolicyName),
      this.client.deleteAuthApproleRole(projectSlug),
      this.client.deleteIdentityGroupName(projectSlug),
    ])
    for (const result of settled) {
      if (result.status !== 'rejected') continue
      const error = result.reason
      if (error instanceof VaultError && error.kind === 'NotFound') continue
      throw error
    }
  }

  @StartActiveSpan()
  private async ensureProjectGroup(groupName: string, policyName: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'vault.group.name': groupName,
      'vault.policy.name': policyName,
    })
    await this.client.upsertIdentityGroupName(groupName, {
      name: groupName,
      type: 'external',
      policies: [policyName],
    })

    const groupResult = await this.client.getIdentityGroupName(groupName)
    if (!groupResult.data?.id) {
      throw new VaultError('InvalidResponse', `Vault group not found after upsert: ${groupName}`, { method: 'GET', path: `/v1/identity/group/name/${groupName}` })
    }

    const groupAliasName = `/${groupName}`
    if (groupResult.data.alias?.name === groupAliasName) return

    const methods = await this.client.getSysAuth()
    const oidc = methods['oidc/']
    if (!oidc?.accessor) {
      throw new VaultError('InvalidResponse', 'Vault OIDC auth method not found (expected "oidc/")', { method: 'GET', path: '/v1/sys/auth' })
    }
    try {
      span?.setAttributes({
        'vault.group.alias.name': groupAliasName,
        'vault.oidc.accessor': oidc.accessor,
      })
      await this.client.createIdentityGroupAlias({
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
    await this.client.upsertSysPoliciesAcl(name, {
      policy: `path "${projectSlug}/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
    })
  }

  async createTechReadOnlyPolicy(name: string, projectSlug: string): Promise<void> {
    await this.client.upsertSysPoliciesAcl(name, {
      policy: `path "${this.config.vaultKvName}/data/${projectSlug}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
    })
  }

  async listProjectSecrets(projectSlug: string): Promise<string[]> {
    const projectPath = generateProjectPath(this.config.projectRootPath, projectSlug)
    return this.listRecursive(this.config.vaultKvName, projectPath, '')
  }

  @StartActiveSpan()
  async deleteProjectSecrets(projectSlug: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'vault.kv.name': this.config.vaultKvName,
    })
    const secrets = await this.listProjectSecrets(projectSlug)
    span?.setAttribute('vault.secrets.count', secrets.length)

    const projectPath = generateProjectPath(this.config.projectRootPath, projectSlug)
    await Promise.allSettled(secrets.map(async (relativePath) => {
      const fullPath = `${projectPath}/${relativePath}`
      try {
        await this.client.delete(fullPath)
      } catch (error) {
        if (error instanceof VaultError && error.kind === 'NotFound') return
        throw error
      }
    }))
  }

  private async listRecursive(
    kvName: string,
    basePath: string,
    relativePath: string,
  ): Promise<string[]> {
    const combined = relativePath.length === 0 ? basePath : `${basePath}/${relativePath}`
    const keys = await this.client.listKvMetadata(kvName, combined)
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

function generateTechReadOnlyPolicyName(project: ProjectWithDetails) {
  return `tech--${project.slug}--ro`
}

function generateAppAdminPolicyName(project: ProjectWithDetails) {
  return `app--${project.slug}--admin`
}

function generateZoneName(name: string) {
  return `zone-${name}`
}

function generateZoneTechReadOnlyPolicyName(zoneName: string) {
  return `tech--${generateZoneName(zoneName)}--ro`
}

function generateApproleRoleBody(policies: string[]) {
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
