import type { ProjectWithDetails, ZoneWithDetails } from './vault-datastore.service'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultError } from './vault-http-client.service'
import {
  ADMIN_GROUP_PATH_PLUGIN_KEY,
  AUDITOR_GROUP_PATH_PLUGIN_KEY,
  CONSOLE_ADMIN_GROUP_NAME,
  CONSOLE_READONLY_GROUP_NAME,
  CONSOLE_SECURITY_GROUP_NAME,
  DEFAULT_ADMIN_GROUP_PATH,
  DEFAULT_AUDITOR_GROUP_PATH,
  DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_DEVOPS_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX,
  DEFAULT_PROJECT_SECURITY_GROUP_PATH_SUFFIX,
  DEFAULT_SECURITY_GROUP_PATH,
  PLATFORM_ADMIN_POLICY_NAME,
  PLATFORM_READONLY_POLICY_NAME,
  PLATFORM_SECURITY_POLICY_NAME,
  PROJECT_DEVELOPER_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PROJECT_DEVOPS_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PROJECT_MAINTAINER_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PROJECT_REPORTER_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  PROJECT_SECURITY_GROUP_PATH_SUFFIX_PLUGIN_KEY,
  SECURITY_GROUP_PATH_PLUGIN_KEY,
  VAULT_PLUGIN_NAME,
} from './vault.constant'
import { generateProjectPath } from './vault.utils'

type ProjectScope = 'admin' | 'devops' | 'developer' | 'readonly' | 'security'

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(VaultDatastoreService) private readonly vaultDatastore: VaultDatastoreService,
    @Inject(VaultClientService) private readonly client: VaultClientService,
  ) {
    this.logger.log('VaultService initialized')
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project upsert event for ${project.slug}`)
    await this.ensureProject(project)
    this.logger.log(`Vault project sync completed for ${project.slug}`)
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project delete event for ${project.slug}`)
    await Promise.all([
      this.deleteProject(project),
      this.deleteProjectSecrets(project.slug),
    ])
    this.logger.log(`Vault project cleanup completed for ${project.slug}`)
  }

  @OnEvent('zone.upsert')
  @StartActiveSpan()
  async handleUpsertZone(zone: ZoneWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('zone.slug', zone.slug)
    this.logger.log(`Handling a zone upsert event for ${zone.slug}`)
    await this.ensureZone(zone)
    this.logger.log(`Vault zone sync completed for ${zone.slug}`)
  }

  @OnEvent('zone.delete')
  @StartActiveSpan()
  async handleDeleteZone(zone: ZoneWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('zone.slug', zone.slug)
    this.logger.log(`Handling a zone delete event for ${zone.slug}`)
    await this.deleteZone(zone.slug)
    this.logger.log(`Vault zone cleanup completed for ${zone.slug}`)
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
    this.logger.log(`Loaded state for Vault reconciliation (projects=${projects.length}, zones=${zones.length})`)
    await Promise.all([
      this.ensureProjects(projects),
      this.ensureZones(zones),
    ])
    this.logger.log(`Vault reconciliation completed (projects=${projects.length} zones=${zones.length})`)
  }

  @StartActiveSpan()
  private async ensureProjects(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.projects.count', projects.length)
    this.logger.verbose(`Reconciling Vault projects (count=${projects.length})`)
    await Promise.all(projects.map(p => this.ensureProject(p)))
  }

  @StartActiveSpan()
  private async ensureProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.verbose(`Reconciling Vault project ${project.slug}`)
    await this.upsertProject(project)
  }

  private async getAdminOrProjectPluginConfig(project: ProjectWithDetails, key: string): Promise<string | undefined> {
    const adminPluginConfig = await this.vaultDatastore.getAdminPluginConfig(VAULT_PLUGIN_NAME, key)
    if (adminPluginConfig) return adminPluginConfig
    return project.plugins?.find(p => p.pluginName === VAULT_PLUGIN_NAME && p.key === key)?.value
  }

  private async getAdminGroupPath(project: ProjectWithDetails) {
    return await this.getAdminOrProjectPluginConfig(project, ADMIN_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_ADMIN_GROUP_PATH
  }

  private async getAuditorGroupPath(project: ProjectWithDetails) {
    return await this.getAdminOrProjectPluginConfig(project, AUDITOR_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_AUDITOR_GROUP_PATH
  }

  private async getSecurityGroupPath(project: ProjectWithDetails) {
    return await this.getAdminOrProjectPluginConfig(project, SECURITY_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_SECURITY_GROUP_PATH
  }

  private async getProjectMaintainerGroupPathSuffix(project: ProjectWithDetails) {
    return await this.getAdminOrProjectPluginConfig(project, PROJECT_MAINTAINER_GROUP_PATH_SUFFIX_PLUGIN_KEY) ?? DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX
  }

  private async getProjectDevopsGroupPathSuffix(project: ProjectWithDetails) {
    return await this.getAdminOrProjectPluginConfig(project, PROJECT_DEVOPS_GROUP_PATH_SUFFIX_PLUGIN_KEY) ?? DEFAULT_PROJECT_DEVOPS_GROUP_PATH_SUFFIX
  }

  private async getProjectDeveloperGroupPathSuffix(project: ProjectWithDetails) {
    return await this.getAdminOrProjectPluginConfig(project, PROJECT_DEVELOPER_GROUP_PATH_SUFFIX_PLUGIN_KEY) ?? DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX
  }

  private async getProjectReporterGroupPathSuffix(project: ProjectWithDetails) {
    return await this.getAdminOrProjectPluginConfig(project, PROJECT_REPORTER_GROUP_PATH_SUFFIX_PLUGIN_KEY) ?? DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX
  }

  private async getProjectSecurityGroupPathSuffix(project: ProjectWithDetails) {
    return await this.getAdminOrProjectPluginConfig(project, PROJECT_SECURITY_GROUP_PATH_SUFFIX_PLUGIN_KEY) ?? DEFAULT_PROJECT_SECURITY_GROUP_PATH_SUFFIX
  }

  @StartActiveSpan()
  private async ensureZones(zones: ZoneWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.zones.count', zones.length)
    this.logger.verbose(`Reconciling Vault zones (count=${zones.length})`)
    await Promise.all(zones.map(z => this.ensureZone(z)))
  }

  @StartActiveSpan()
  private async ensureZone(zone: ZoneWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('zone.slug', zone.slug)
    this.logger.verbose(`Reconciling Vault zone ${zone.slug}`)
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
      this.logger.log(`Created Vault mount ${kvName}`)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'HttpError' && error.status === 400) {
        await this.client.tuneSysMount(kvName, tuneBody)
        this.logger.log(`Vault mount ${kvName} already existed, so it was tuned to the expected settings`)
        return
      }
      throw error
    }
  }

  private async deleteMount(kvName: string): Promise<void> {
    try {
      await this.client.deleteSysMounts(kvName)
      this.logger.log(`Deleted Vault mount ${kvName}`)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') {
        this.logger.warn(`Vault mount ${kvName} was already missing`)
        return
      }
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
    const projectDevopsPolicyName = generateProjectPolicyName(project, 'devops')
    const projectDeveloperPolicyName = generateProjectPolicyName(project, 'developer')
    const projectReadOnlyPolicyName = generateProjectPolicyName(project, 'readonly')
    const projectSecurityPolicyName = generateProjectPolicyName(project, 'security')
    await this.upsertMount(project.slug)

    const [
      adminGroupPath,
      auditorGroupPath,
      securityGroupPath,
      maintainerGroupPathSuffix,
      devopsGroupPathSuffix,
      developerGroupPathSuffix,
      reporterGroupPathSuffix,
      securityGroupPathSuffix,
    ] = await Promise.all([
      this.getAdminGroupPath(project),
      this.getAuditorGroupPath(project),
      this.getSecurityGroupPath(project),
      this.getProjectMaintainerGroupPathSuffix(project),
      this.getProjectDevopsGroupPathSuffix(project),
      this.getProjectDeveloperGroupPathSuffix(project),
      this.getProjectReporterGroupPathSuffix(project),
      this.getProjectSecurityGroupPathSuffix(project),
    ])

    const projectAdminGroupPaths = generateProjectRoleGroupPaths(project, maintainerGroupPathSuffix)
    const projectDevopsGroupPaths = generateProjectRoleGroupPaths(project, devopsGroupPathSuffix)
    const projectDeveloperGroupPaths = generateProjectRoleGroupPaths(project, developerGroupPathSuffix)
    const projectReadOnlyGroupPaths = generateProjectRoleGroupPaths(project, reporterGroupPathSuffix)
    const projectSecurityGroupPaths = generateProjectRoleGroupPaths(project, securityGroupPathSuffix)

    await Promise.all([
      this.createAppAdminPolicy(appPolicyName, project.slug),
      this.createTechReadOnlyPolicy(techPolicyName, project.slug),
      this.createProjectDevopsPolicy(projectDevopsPolicyName, project.slug),
      this.createProjectDeveloperPolicy(projectDeveloperPolicyName, project.slug),
      this.createProjectReadOnlyPolicy(projectReadOnlyPolicyName, project.slug),
      this.createProjectSecurityPolicy(projectSecurityPolicyName, project.slug),
      this.createPlatformAdminPolicy(PLATFORM_ADMIN_POLICY_NAME),
      this.createPlatformReadOnlyPolicy(PLATFORM_READONLY_POLICY_NAME),
      this.createPlatformSecurityPolicy(PLATFORM_SECURITY_POLICY_NAME),
      this.ensureIdentityGroup(CONSOLE_ADMIN_GROUP_NAME, [PLATFORM_ADMIN_POLICY_NAME], adminGroupPath),
      this.ensureIdentityGroup(CONSOLE_READONLY_GROUP_NAME, [PLATFORM_READONLY_POLICY_NAME], auditorGroupPath),
      this.ensureIdentityGroup(CONSOLE_SECURITY_GROUP_NAME, [PLATFORM_SECURITY_POLICY_NAME], securityGroupPath),
      ...projectAdminGroupPaths.map(groupPath =>
        this.ensureIdentityGroup(generateProjectGroupName(project, 'admin'), [appPolicyName], groupPath)),
      ...projectDevopsGroupPaths.map(groupPath =>
        this.ensureIdentityGroup(generateProjectGroupName(project, 'devops'), [projectDevopsPolicyName], groupPath)),
      ...projectDeveloperGroupPaths.map(groupPath =>
        this.ensureIdentityGroup(generateProjectGroupName(project, 'developer'), [projectDeveloperPolicyName], groupPath)),
      ...projectReadOnlyGroupPaths.map(groupPath =>
        this.ensureIdentityGroup(generateProjectGroupName(project, 'readonly'), [projectReadOnlyPolicyName], groupPath)),
      ...projectSecurityGroupPaths.map(groupPath =>
        this.ensureIdentityGroup(generateProjectGroupName(project, 'security'), [projectSecurityPolicyName], groupPath)),
      this.client.upsertAuthApproleRole(project.slug, generateApproleRoleBody([techPolicyName, appPolicyName])),
    ])
  }

  @StartActiveSpan()
  async deleteProject(project: ProjectWithDetails): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('vault.kv.name', project.slug)
    const appPolicyName = generateAppAdminPolicyName(project)
    const techPolicyName = generateTechReadOnlyPolicyName(project)
    const projectDevopsPolicyName = generateProjectPolicyName(project, 'devops')
    const projectDeveloperPolicyName = generateProjectPolicyName(project, 'developer')
    const projectReadOnlyPolicyName = generateProjectPolicyName(project, 'readonly')
    const projectSecurityPolicyName = generateProjectPolicyName(project, 'security')

    await this.deleteMount(project.slug)

    const settled = await Promise.allSettled([
      this.client.deleteSysPoliciesAcl(appPolicyName),
      this.client.deleteSysPoliciesAcl(techPolicyName),
      this.client.deleteSysPoliciesAcl(projectDevopsPolicyName),
      this.client.deleteSysPoliciesAcl(projectDeveloperPolicyName),
      this.client.deleteSysPoliciesAcl(projectReadOnlyPolicyName),
      this.client.deleteSysPoliciesAcl(projectSecurityPolicyName),
      this.client.deleteAuthApproleRole(project.slug),
      this.client.deleteIdentityGroupName(generateProjectGroupName(project, 'admin')),
      this.client.deleteIdentityGroupName(generateProjectGroupName(project, 'devops')),
      this.client.deleteIdentityGroupName(generateProjectGroupName(project, 'developer')),
      this.client.deleteIdentityGroupName(generateProjectGroupName(project, 'readonly')),
      this.client.deleteIdentityGroupName(generateProjectGroupName(project, 'security')),
    ])
    for (const result of settled) {
      if (result.status !== 'rejected') continue
      const error = result.reason
      if (error instanceof VaultError && error.kind === 'NotFound') continue
      throw error
    }
  }

  @StartActiveSpan()
  private async ensureIdentityGroup(groupName: string, policies: string[], groupAliasName: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'vault.group.name': groupName,
      'vault.policies.count': policies.length,
    })
    await this.client.upsertIdentityGroupName(groupName, {
      name: groupName,
      type: 'external',
      policies,
    })

    const groupResult = await this.client.getIdentityGroupName(groupName)
    if (!groupResult.data?.id) {
      throw new VaultError('InvalidResponse', `Vault group not found after upsert: ${groupName}`, { method: 'GET', path: `/v1/identity/group/name/${groupName}` })
    }

    const normalizedAliasName = groupAliasName.startsWith('/') ? groupAliasName : `/${groupAliasName}`
    if (groupResult.data.alias?.name === normalizedAliasName) return

    const methods = await this.client.getSysAuth()
    const oidc = methods['oidc/']
    if (!oidc?.accessor) {
      throw new VaultError('InvalidResponse', 'Vault OIDC auth method not found (expected "oidc/")', { method: 'GET', path: '/v1/sys/auth' })
    }
    try {
      span?.setAttributes({
        'vault.group.alias.name': normalizedAliasName,
        'vault.oidc.accessor': oidc.accessor,
      })
      await this.client.createIdentityGroupAlias({
        name: normalizedAliasName,
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

  async createProjectDevopsPolicy(name: string, projectSlug: string): Promise<void> {
    await this.client.upsertSysPoliciesAcl(name, {
      policy: [
        `path "${projectSlug}/data/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
        `path "${projectSlug}/metadata/*" { capabilities = ["read", "list"] }`,
        `path "${projectSlug}/delete/*" { capabilities = ["update"] }`,
        `path "${projectSlug}/undelete/*" { capabilities = ["update"] }`,
        `path "${projectSlug}/destroy/*" { capabilities = ["update"] }`,
      ].join('\n'),
    })
  }

  async createProjectDeveloperPolicy(name: string, projectSlug: string): Promise<void> {
    await this.client.upsertSysPoliciesAcl(name, {
      policy: [
        `path "${projectSlug}/data/*" { capabilities = ["read"] }`,
        `path "${projectSlug}/metadata/*" { capabilities = ["read", "list"] }`,
      ].join('\n'),
    })
  }

  async createProjectReadOnlyPolicy(name: string, projectSlug: string): Promise<void> {
    await this.client.upsertSysPoliciesAcl(name, {
      policy: [
        `path "${projectSlug}/data/*" { capabilities = ["read"] }`,
        `path "${projectSlug}/metadata/*" { capabilities = ["read", "list"] }`,
      ].join('\n'),
    })
  }

  async createProjectSecurityPolicy(name: string, projectSlug: string): Promise<void> {
    await this.client.upsertSysPoliciesAcl(name, {
      policy: `path "${projectSlug}/metadata/*" { capabilities = ["read", "list"] }`,
    })
  }

  async createPlatformAdminPolicy(name: string): Promise<void> {
    await this.client.upsertSysPoliciesAcl(name, {
      policy: `path "sys/*" { capabilities = ["create", "read", "update", "delete", "list", "sudo"] }`,
    })
  }

  async createPlatformReadOnlyPolicy(name: string): Promise<void> {
    await this.client.upsertSysPoliciesAcl(name, {
      policy: [
        `path "sys/health" { capabilities = ["read"] }`,
        `path "sys/mounts" { capabilities = ["read"] }`,
        `path "sys/mounts/*" { capabilities = ["read"] }`,
        `path "sys/auth" { capabilities = ["read"] }`,
        `path "sys/auth/*" { capabilities = ["read"] }`,
        `path "sys/policies/*" { capabilities = ["read", "list"] }`,
      ].join('\n'),
    })
  }

  async createPlatformSecurityPolicy(name: string): Promise<void> {
    await this.client.upsertSysPoliciesAcl(name, {
      policy: [
        `path "sys/audit" { capabilities = ["read", "list"] }`,
        `path "sys/audit/*" { capabilities = ["read", "list"] }`,
        `path "sys/policies/*" { capabilities = ["read", "list"] }`,
        `path "sys/auth" { capabilities = ["read"] }`,
        `path "sys/auth/*" { capabilities = ["read"] }`,
      ].join('\n'),
    })
  }

  async createTechReadOnlyPolicy(name: string, projectSlug: string): Promise<void> {
    await this.client.upsertSysPoliciesAcl(name, {
      policy: `path "${this.config.vaultKvName}/data/${projectSlug}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
    })
  }

  async listProjectSecrets(projectSlug: string): Promise<string[]> {
    const projectPath = generateProjectPath(this.config.projectRootDir, projectSlug)
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

    const projectPath = generateProjectPath(this.config.projectRootDir, projectSlug)
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

function generateProjectPolicyName(project: ProjectWithDetails, scope: ProjectScope) {
  return `project--${project.slug}--${scope}`
}

function generateProjectGroupName(project: ProjectWithDetails, scope: ProjectScope) {
  return `project-${project.slug}-${scope}`
}

function generateProjectRoleGroupPaths(project: ProjectWithDetails, rawGroupPathSuffixes: string) {
  return rawGroupPathSuffixes
    .split(',')
    .map(path => path.trim())
    .filter(Boolean)
    .map(path => `/${project.slug}${path}`)
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
