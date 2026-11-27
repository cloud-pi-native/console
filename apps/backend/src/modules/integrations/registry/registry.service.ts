import type { ConfigType } from '@nestjs/config'
import type { ProjectEventPayload } from '../../core/events/app-events.service'
import type { RequiredPluginResult } from '../../core/plugin/plugin.utils'
import type { VaultSecret } from '../vault/vault-client.service'
import type {
  HarborAccess,
  HarborGroupMemberRequest,
  HarborMember,
} from './registry-client.service'
import type { ProjectWithDetails } from './registry-datastore.service'
import type { VaultRobotSecret } from './registry.utils'
import { daysAgo } from '@cpn-console/shared'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { baseConfigFactory } from '../../../config/base.config'
import { harborConfigFactory } from '../../../config/harbor.config'
import { find } from '../../../utils/iterable.utils'
import { capturePluginResult } from '../../core/plugin/plugin.utils'
import { StartActiveSpan } from '../../infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from '../vault/vault-client.service'
import { isVaultNotFound } from '../vault/vault.utils'
import { RegistryClientService, roAccess, rwAccess } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryPluginService } from './registry-plugin.service'
import {
  BASE_ADMIN_PROJECT_GROUP_PATH_SUFFIX,
  DEFAULT_PLATFORM_ADMIN_GROUP_PATHS,
  DEFAULT_PLATFORM_GUEST_GROUP_PATHS,
  DEFAULT_PROJECT_ADMIN_GROUP_PATH_SUFFIXES,
  DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES,
  DEFAULT_PROJECT_GUEST_GROUP_PATH_SUFFIXES,
  DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES,
  HARBOR_ROLE_LIMITED_GUEST,
  PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY,
  PLATFORM_GUEST_GROUP_PATHS_PLUGIN_KEY,
  PLUGIN_NAME,
  PROJECT_ADMIN_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_GUEST_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT,
  ROBOT_NAME_PROJECT,
  ROBOT_NAME_RO,
  ROBOT_NAME_RW,
} from './registry.constants'
import {
  generateHarborAccessLevelMapping,
  generateProjectRoleGroupPath,
  generateRetentionPolicy,
  generateRobotFullName,
  generateRobotPermissions,
  generateVaultRobotSecret,
  getHostFromUrl,
  getPluginConfig,
  getProjectVaultPath,
  parseBytes,
  parseGroupPaths,
} from './registry.utils'

@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name)

  constructor(
    @Inject(RegistryClientService) private readonly client: RegistryClientService,
    @Inject(RegistryDatastoreService) private readonly datastore: RegistryDatastoreService,
    @Inject(RegistryPluginService) private readonly registryPlugin: RegistryPluginService,
    @Inject(harborConfigFactory.KEY) private readonly harborConfig: ConfigType<typeof harborConfigFactory>,
    @Inject(baseConfigFactory.KEY) private readonly baseConfig: ConfigType<typeof baseConfigFactory>,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
  ) {
    this.logger.log('RegistryService initialized')
  }

  private get host() {
    return getHostFromUrl(this.harborConfig.url)
  }

  private async getRobot(project: ProjectWithDetails, harborProjectId: number, robotName: string) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'registry.robot.name': robotName,
    })
    const fullName = generateRobotFullName(project, robotName)
    return find(this.client.getProjectRobots(harborProjectId), r => r?.name === fullName)
  }

  private robotExpirationDays(robotName: string): number {
    if (robotName === ROBOT_NAME_RO) return this.harborConfig.robotExpirationRoDays
    if (robotName === ROBOT_NAME_RW) return this.harborConfig.robotExpirationRwDays
    return this.harborConfig.robotExpirationProjectDays
  }

  private async ensureProjectRobot(project: ProjectWithDetails, robotName: string, access: HarborAccess[]) {
    const created = await this.client.ensureRobot(
      generateRobotPermissions(project, robotName, access, this.robotExpirationDays(robotName)),
    )
    if (!created) {
      throw new Error(`Harbor robot already exists (${robotName})`)
    }
    return created
  }

  private async rotateRobot(project: ProjectWithDetails, harborProjectId: number, robotName: string, access: HarborAccess[]) {
    const existing = await this.getRobot(project, harborProjectId, robotName)
    if (existing?.id) {
      await this.client.deleteRobot(existing.id)
    }
    return this.ensureProjectRobot(project, robotName, access)
  }

  private async ensureRobotSecret(project: ProjectWithDetails, harborProjectId: number, robotName: string, access: HarborAccess[]) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'registry.robot.name': robotName,
    })
    const vaultPath = getProjectVaultPath(project, this.baseConfig.projectsRootDir, `REGISTRY/${robotName}`)
    const vaultRobotSecret = await this.vault.read<VaultRobotSecret>(vaultPath).catch((error) => {
      if (isVaultNotFound(error)) return null
      throw error
    })

    if (this.robotExpirationDays(robotName) <= 0 && vaultRobotSecret?.data?.HOST === this.host) {
      const existing = await this.getRobot(project, harborProjectId, robotName)
      if (!existing?.id) {
        const created = await this.ensureProjectRobot(project, robotName, access)
        const fullName = generateRobotFullName(project, robotName)
        const secret = generateVaultRobotSecret(this.host, fullName, created.secret)
        await this.vault.write(secret, vaultPath)
        span?.setAttribute('vault.secret.written', true)
        return secret
      }
    }

    const expiring = this.robotExpirationDays(robotName) > 0
      && !!vaultRobotSecret
      && this.isRobotSecretExpiring(vaultRobotSecret)

    span?.setAttributes({
      'vault.secret.exists': !!vaultRobotSecret,
      'registry.robot.secret.expiring': expiring,
    })

    if (vaultRobotSecret?.data?.HOST === this.host && !expiring) {
      const targetDuration = this.robotExpirationDays(robotName)
      const existing = await this.getRobot(project, harborProjectId, robotName)
      if (existing?.id && existing.duration !== targetDuration) {
        await this.client.updateRobot(
          existing.id,
          generateRobotPermissions(project, generateRobotFullName(project, robotName), access, targetDuration, existing.disabled ?? false),
        )
      }
      span?.setAttribute('vault.secret.reused', true)
      return vaultRobotSecret.data
    }

    const existing = await this.getRobot(project, harborProjectId, robotName)
    const created = existing
      ? await this.rotateRobot(project, harborProjectId, robotName, access)
      : await this.ensureProjectRobot(project, robotName, access)
    const fullName = generateRobotFullName(project, robotName)
    const secret = generateVaultRobotSecret(this.host, fullName, created.secret)
    await this.vault.write(secret, vaultPath)
    span?.setAttribute('vault.secret.written', true)
    return secret
  }

  private async revokeRobotSecret(project: ProjectWithDetails, harborProjectId: number, robotName: string) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'registry.robot.name': robotName,
    })
    const existing = await this.getRobot(project, harborProjectId, robotName)
    if (existing?.id) {
      await this.client.deleteRobot(existing.id)
    }
    const vaultPath = getProjectVaultPath(project, this.baseConfig.projectsRootDir, `REGISTRY/${robotName}`)
    try {
      await this.vault.delete(vaultPath)
    } catch (error) {
      if (!isVaultNotFound(error)) throw error
    }
  }

  private isRobotSecretExpiring(vaultSecret: VaultSecret): boolean {
    const createdTimeRaw = vaultSecret?.metadata?.created_time
    if (!createdTimeRaw) return false
    const createdTime = new Date(createdTimeRaw)
    return daysAgo(createdTime) > this.harborConfig.robotRotationThresholdDays
  }

  private async ensureProjectGroupMember(
    projectSlug: string,
    groupName: string,
    accessLevel: number,
    membersByName: Map<string, HarborMember>,
  ) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.group.name': groupName,
      'registry.group.access_level': accessLevel,
    })
    const existing = membersByName.get(groupName)

    if (existing?.id) {
      if (existing.role_id !== accessLevel || existing.entity_type !== 'g') {
        await this.client.removeGroupMember(projectSlug, Number(existing.id))
        membersByName.delete(groupName)
      } else {
        span?.setAttribute('registry.member.exists', true)
        return
      }
    }

    const body: HarborGroupMemberRequest = {
      role_id: accessLevel,
      member_group: {
        group_name: groupName,
        group_type: 3,
      },
    }
    await this.client.ensureGroupMember(projectSlug, body)
    span?.setAttribute('registry.member.created', true)
  }

  private async ensureProjectGroupMembers(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)

    const members = await this.client.getGroupMembers(project.slug)
    if (members.status !== 200 || !members.data) {
      throw new Error(`Harbor list members failed (${members.status})`)
    }

    const membersByName = new Map<string, HarborMember>()
    for (const member of members.data) {
      const name = member?.entity_name
      if (name) membersByName.set(name, member)
    }

    const byGroupName = await this.generateAccessLevelMapping(project)

    await Promise.all(
      Array.from(byGroupName.entries(), ([groupName, accessLevel]) => this.ensureProjectGroupMember(
        project.slug,
        groupName,
        accessLevel,
        membersByName,
      )),
    )
  }

  private async ensureProjectQuota(project: ProjectWithDetails, storageLimit: number) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'registry.storage_limit.bytes': storageLimit,
    })
    const harborProject = await this.client.ensureProject(project.slug, storageLimit)
    if (harborProject === undefined) throw new Error(`Harbor project ${project.slug} not found`)
    const projectId = Number(harborProject.project_id)
    if (Number.isFinite(projectId)) {
      const quotas = await this.client.listQuotas(projectId)
      const hardQuota = quotas.data?.find(q => q?.ref?.id === projectId)
      if (hardQuota?.hard?.storage !== storageLimit) await this.client.updateQuota(projectId, storageLimit)
    }
    return harborProject
  }

  private async ensureRetentionPolicy(project: ProjectWithDetails, harborProjectId: number) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'registry.project.id': harborProjectId,
    })
    const policy = generateRetentionPolicy(harborProjectId, {
      harborRuleTemplate: this.harborConfig.ruleTemplate,
      harborRuleCount: this.harborConfig.ruleCount,
      harborRetentionCron: this.harborConfig.retentionCron,
    })
    await this.client.ensureRetention(project.slug, policy)
  }

  @StartActiveSpan()
  async ensureProject(project: ProjectWithDetails, options: { storageLimitBytes?: number, publishProjectRobot?: boolean } = {}) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'registry.publish_project_robot': !!options.publishProjectRobot,
    })
    const storageLimit = options.storageLimitBytes ?? -1
    const harborProject = await this.ensureProjectQuota(project, storageLimit)
    if (harborProject === undefined) throw new Error(`Harbor project ${project.slug} not found`)
    const harborProjectId = Number(harborProject.project_id)
    if (!Number.isFinite(harborProjectId))
      throw new Error('Unable to retrieve Harbor project_id')

    await Promise.all([
      this.ensureRobotSecret(project, harborProjectId, ROBOT_NAME_RO, roAccess),
      this.ensureRobotSecret(project, harborProjectId, ROBOT_NAME_RW, rwAccess),
      this.ensureProjectGroupMembers(project),
      this.ensureRetentionPolicy(project, harborProjectId),
      options.publishProjectRobot
        ? this.ensureRobotSecret(project, harborProjectId, ROBOT_NAME_PROJECT, roAccess)
        : this.revokeRobotSecret(project, harborProjectId, ROBOT_NAME_PROJECT),
    ])

    return {
      projectId: harborProjectId,
      basePath: `${this.host}/${project.slug}/`,
    }
  }

  @StartActiveSpan()
  async deleteProject(projectSlug: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    const existing = await this.client.getProjectByName(projectSlug)
    if (existing.status === 404) {
      span?.setAttribute('registry.project.exists', false)
      return
    }
    await this.deleteRepositories(projectSlug)
    const deleted = await this.client.deleteProjectByName(projectSlug)
    if (deleted.status >= 300 && deleted.status !== 404) {
      throw new Error(`Harbor delete project failed (${deleted.status})`)
    }
  }

  private async deleteRepositories(projectSlug: string) {
    for await (const repository of this.client.getRepositories(projectSlug)) {
      const name = repository.name
      if (!name) continue
      await this.client.deleteRepository(projectSlug, name.split('/').slice(1).join('/'))
    }
  }

  @OnEvent('project.upsert')
  async handleUpsert(payload: ProjectEventPayload): Promise<RequiredPluginResult<'harbor'>> {
    return capturePluginResult('harbor', async () => {
      const project = await this.datastore.getProject(payload.projectId)
      if (!project) {
        this.logger.warn(`project event skipped: project not found (projectId=${payload.projectId})`)
        return
      }
      return this.syncProject(project)
    })
  }

  @StartActiveSpan()
  private async syncProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project upsert for ${project.slug}`)
    const quotaConfigRaw = getPluginConfig(project, REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT)
    const parsedQuota = quotaConfigRaw ? parseBytes(String(quotaConfigRaw)) : undefined
    const storageLimitBytes = parsedQuota ?? -1
    const publishProjectRobot = await this.registryPlugin.isProjectRobotEnabled(project)
    await this.ensureProject(project, { storageLimitBytes, publishProjectRobot })
  }

  @OnEvent('project.delete')
  async handleDelete(payload: ProjectEventPayload): Promise<RequiredPluginResult<'harbor'>> {
    return capturePluginResult('harbor', async () => {
      const project = await this.datastore.getProject(payload.projectId)
      if (!project) {
        this.logger.warn(`project event skipped: project not found (projectId=${payload.projectId})`)
        return
      }
      return this.cleanupProject(project)
    })
  }

  @StartActiveSpan()
  private async cleanupProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.deleteProject(project.slug)
  }

  // @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    const span = trace.getActiveSpan()
    this.logger.log('Starting Registry reconciliation')
    const projects = await this.datastore.getAllProjects()
    span?.setAttribute('registry.projects.count', projects.length)
    await Promise.all(projects.map(p => this.syncProject(p)))
  }

  private async getAdminPluginConfig(key: string): Promise<string | null> {
    return await this.datastore.getAdminPluginConfig(PLUGIN_NAME, key)
  }

  private async getAdminOrProjectPluginConfig(project: ProjectWithDetails, key: string): Promise<string | undefined> {
    const adminPluginConfig = await this.getAdminPluginConfig(key)
    if (adminPluginConfig) return adminPluginConfig
    return getPluginConfig(project, key)
  }

  private async getPlatformAdminGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const raw = await this.getAdminOrProjectPluginConfig(project, PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_PLATFORM_ADMIN_GROUP_PATHS
    return parseGroupPaths(raw)
  }

  private async getPlatformGuestGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const raw = await this.getAdminOrProjectPluginConfig(project, PLATFORM_GUEST_GROUP_PATHS_PLUGIN_KEY) ?? DEFAULT_PLATFORM_GUEST_GROUP_PATHS
    return parseGroupPaths(raw)
  }

  private async getProjectAdminGroupPaths(project: ProjectWithDetails): Promise<Set<string>> {
    const raw = await this.getAdminOrProjectPluginConfig(project, PROJECT_ADMIN_GROUP_PATH_SUFFIXES_PLUGIN_KEY) ?? DEFAULT_PROJECT_ADMIN_GROUP_PATH_SUFFIXES
    return generateProjectRoleGroupPath(project.slug, `${raw},${BASE_ADMIN_PROJECT_GROUP_PATH_SUFFIX}`)
  }

  private async getProjectMaintainerGroupPaths(project: ProjectWithDetails): Promise<Set<string>> {
    const raw = await this.getAdminOrProjectPluginConfig(project, PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES_PLUGIN_KEY) ?? DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectDeveloperGroupPaths(project: ProjectWithDetails): Promise<Set<string>> {
    const raw = await this.getAdminOrProjectPluginConfig(project, PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES_PLUGIN_KEY) ?? DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectGuestGroupPaths(project: ProjectWithDetails): Promise<Set<string>> {
    const raw = await this.getAdminOrProjectPluginConfig(project, PROJECT_GUEST_GROUP_PATH_SUFFIXES_PLUGIN_KEY) ?? DEFAULT_PROJECT_GUEST_GROUP_PATH_SUFFIXES
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async generateAccessLevelMapping(project: ProjectWithDetails) {
    const [
      platformAdminGroupPaths,
      platformGuestGroupPaths,
      projectAdminGroupPaths,
      projectMaintainerGroupPaths,
      projectDeveloperGroupPaths,
      projectGuestGroupPaths,
    ] = await Promise.all([
      this.getPlatformAdminGroupPaths(project),
      this.getPlatformGuestGroupPaths(project),
      this.getProjectAdminGroupPaths(project),
      this.getProjectMaintainerGroupPaths(project),
      this.getProjectDeveloperGroupPaths(project),
      this.getProjectGuestGroupPaths(project),
    ])

    const roles = generateHarborAccessLevelMapping({
      guest: projectGuestGroupPaths,
      developer: projectDeveloperGroupPaths,
      maintainer: projectMaintainerGroupPaths,
      admin: projectAdminGroupPaths,
      platformAdmin: platformAdminGroupPaths,
      platformGuest: platformGuestGroupPaths,
    })
    return new Map([
      [`/${project.slug}`, HARBOR_ROLE_LIMITED_GUEST],
      ...roles,
    ])
  }
}
