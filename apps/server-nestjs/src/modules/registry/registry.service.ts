import type {
  HarborAccess,
  HarborGroupMemberRequest,
  HarborMember,
  HarborProjectQuota,
  HarborRetentionPolicy,
  HarborRobotCreateRequest,
} from './registry-client.service'
import type { ProjectWithDetails } from './registry-datastore.service'
import type { VaultRobotSecret } from './registry.utils'
import { specificallyEnabled } from '@cpn-console/hooks'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { VaultClientService, VaultSecret } from '../vault/vault-client.service'
import { VaultError } from '../vault/vault-http-client.service.js'
import { projectRobotName, RegistryClientService, roAccess, roRobotName, rwAccess, rwRobotName } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import {
  DEFAULT_PLATFORM_ADMIN_GROUP_PATHS,
  DEFAULT_PLATFORM_GUEST_GROUP_PATHS,
  DEFAULT_PROJECT_ADMIN_GROUP_PATH_SUFFIXES,
  DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES,
  DEFAULT_PROJECT_GUEST_GROUP_PATH_SUFFIXES,
  DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES,
  HARBOR_ROLE_DEVELOPER,
  HARBOR_ROLE_GUEST,
  HARBOR_ROLE_LIMITED_GUEST,
  HARBOR_ROLE_MAINTAINER,
  HARBOR_ROLE_PROJECT_ADMIN,
  PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY,
  PLATFORM_GUEST_GROUP_PATHS_PLUGIN_KEY,
  PROJECT_ADMIN_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_GUEST_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT,
  REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT,
  REGISTRY_PLUGIN_NAME,
} from './registry.constants'
import { generateVaultRobotSecret, getHostFromUrl, getProjectVaultPath, parseBytes } from './registry.utils'

const allowedRuleTemplates = [
  'always',
  'latestPulledK',
  'latestPushedK',
  'nDaysSinceLastPull',
  'nDaysSinceLastPush',
] as const

type RuleTemplate = typeof allowedRuleTemplates[number]

@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name)

  constructor(
    @Inject(RegistryClientService) private readonly client: RegistryClientService,
    @Inject(RegistryDatastoreService) private readonly registryDatastore: RegistryDatastoreService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
  ) {
    this.logger.log('RegistryService initialized')
  }

  private get host() {
    if (!this.config.harborUrl) {
      throw new Error('HARBOR_URL is required')
    }
    return getHostFromUrl(this.config.harborUrl)
  }

  private async getRobot(project: ProjectWithDetails, robotName: string) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'registry.robot.name': robotName,
    })
    const robots = await this.client.getProjectRobots(project.slug)
    if (robots.status !== 200 || !robots.data) return undefined
    const fullName = generateRobotFullName(project, robotName)
    return robots.data.find(r => r?.name === fullName)
  }

  private async createProjectRobot(project: ProjectWithDetails, robotName: string, access: HarborAccess[]) {
    const created = await this.client.createRobot(
      generateRobotPermissions(project, robotName, access),
    )
    if (created.status >= 300 || !created.data) {
      throw new Error(`Harbor create robot failed (${created.status})`)
    }
    return created.data
  }

  private async rotateRobot(project: ProjectWithDetails, robotName: string, access: HarborAccess[]) {
    const existing = await this.getRobot(project, robotName)
    if (existing?.id) {
      await this.client.deleteRobot(project.slug, existing.id)
    }
    return this.createProjectRobot(project, robotName, access)
  }

  private async ensureRobotSecret(project: ProjectWithDetails, robotName: string, access: HarborAccess[]) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'registry.robot.name': robotName,
    })
    if (!this.config.projectRootDir) {
      throw new Error('PROJECTS_ROOT_DIR is required')
    }
    const relativeVaultPath = `REGISTRY/${robotName}`
    const vaultPath = getProjectVaultPath(project, this.config.projectRootDir, relativeVaultPath)
    const vaultRobotSecret = await this.vault.read<VaultRobotSecret>(vaultPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })

    const expiring = vaultRobotSecret
      ? this.isRobotSecretExpiring(vaultRobotSecret)
      : false

    span?.setAttributes({
      'vault.secret.exists': !!vaultRobotSecret,
      'registry.robot.secret.expiring': expiring,
    })

    if (vaultRobotSecret?.data?.HOST === this.host && !expiring) {
      span?.setAttribute('vault.secret.reused', true)
      return vaultRobotSecret.data
    }

    const existing = await this.getRobot(project, robotName)
    const created = existing
      ? await this.rotateRobot(project, robotName, access)
      : await this.createProjectRobot(project, robotName, access)
    const fullName = generateRobotFullName(project, robotName)
    const secret = generateVaultRobotSecret(this.host, fullName, created.secret)
    await this.vault.write(secret, vaultPath)
    span?.setAttribute('vault.secret.written', true)
    return secret
  }

  private isRobotSecretExpiring(vaultSecret: VaultSecret): boolean {
    const createdTimeRaw = vaultSecret?.metadata?.created_time
    if (!createdTimeRaw) return false
    const createdTime = new Date(createdTimeRaw)
    return daysAgoFromNow(createdTime) > this.config.harborRobotRotationThresholdDays
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
    const created = await this.client.addGroupMember(projectSlug, body)
    if (created.status >= 300) {
      throw new Error(`Harbor create member failed (${created.status})`)
    }
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
    const existing = await this.client.getProjectByName(project.slug)
    if (existing.status === 200 && existing.data) {
      const projectId = Number(existing.data.project_id)
      if (!Number.isFinite(projectId)) return existing.data

      const quotas = await this.client.listQuotas(projectId)
      if (quotas.status === 200 && quotas.data) {
        const hardQuota = quotas.data.find((q: HarborProjectQuota) => q?.ref?.id === projectId)
        if (hardQuota?.hard?.storage !== storageLimit) {
          await this.client.updateQuota(projectId, storageLimit)
          span?.setAttribute('registry.quota.updated', true)
        }
      }
      return existing.data
    }

    const created = await this.client.createProject(project.slug, storageLimit)
    if (created.status >= 300) {
      throw new Error(`Harbor create project failed (${created.status})`)
    }
    span?.setAttribute('registry.project.created', true)

    const fetched = await this.client.getProjectByName(project.slug)
    if (fetched.status !== 200 || !fetched.data) {
      throw new Error(`Harbor get project failed (${fetched.status})`)
    }
    return fetched.data
  }

  private async ensureRetentionPolicy(project: ProjectWithDetails, harborProjectId: number) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': project.slug,
      'registry.project.id': harborProjectId,
    })
    const policy = generateRetentionPolicy(harborProjectId, {
      harborRuleTemplate: this.config.harborRuleTemplate,
      harborRuleCount: this.config.harborRuleCount,
      harborRetentionCron: this.config.harborRetentionCron,
    })
    const retentionId = await this.client.getRetentionId(project.slug)
    span?.setAttribute('registry.retention.exists', !!retentionId)
    const result = retentionId
      ? await this.client.updateRetention(retentionId, policy)
      : await this.client.createRetention(policy)
    if (result.status >= 300) {
      throw new Error(`Harbor retention policy failed (${result.status})`)
    }
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
    const harborProjectId = Number(harborProject.project_id)

    await Promise.all([
      this.ensureRobotSecret(project, roRobotName, roAccess),
      this.ensureRobotSecret(project, rwRobotName, rwAccess),
      this.ensureProjectGroupMembers(project),
      Number.isFinite(harborProjectId) ? this.ensureRetentionPolicy(project, harborProjectId) : Promise.resolve(),
      options.publishProjectRobot
        ? this.ensureRobotSecret(project, projectRobotName, roAccess)
        : Promise.resolve(),
    ])

    return {
      projectId: Number.isFinite(harborProjectId) ? harborProjectId : undefined,
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
    const deleted = await this.client.deleteProjectByName(projectSlug)
    if (deleted.status >= 300 && deleted.status !== 404) {
      throw new Error(`Harbor delete project failed (${deleted.status})`)
    }
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project upsert for ${project.slug}`)
    const quotaConfigRaw = getPluginConfig(project, REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT)
    const publishConfig = getPluginConfig(project, REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT)
    const parsedQuota = quotaConfigRaw ? parseBytes(String(quotaConfigRaw)) : undefined
    const storageLimitBytes = parsedQuota ?? -1
    const publishProjectRobot = specificallyEnabled(publishConfig)
    await this.ensureProject(project, { storageLimitBytes, publishProjectRobot })
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.deleteProject(project.slug)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    const span = trace.getActiveSpan()
    this.logger.log('Starting Registry reconciliation')
    const projects = await this.registryDatastore.getAllProjects()
    span?.setAttribute('registry.projects.count', projects.length)
    await Promise.all(projects.map(p => this.ensureProject(p)))
  }

  private async getAdminOrProjectPluginConfig(project: ProjectWithDetails, key: string) {
    const adminPluginConfig = await this.registryDatastore.getAdminPluginConfig(REGISTRY_PLUGIN_NAME, key)
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

  private async getProjectAdminGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const raw = await this.getAdminOrProjectPluginConfig(project, PROJECT_ADMIN_GROUP_PATH_SUFFIXES_PLUGIN_KEY) ?? DEFAULT_PROJECT_ADMIN_GROUP_PATH_SUFFIXES
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectMaintainerGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const raw = await this.getAdminOrProjectPluginConfig(project, PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES_PLUGIN_KEY) ?? DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectDeveloperGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const raw = await this.getAdminOrProjectPluginConfig(project, PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES_PLUGIN_KEY) ?? DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectGuestGroupPaths(project: ProjectWithDetails): Promise<string[]> {
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

    const platformRoles = generateHarborAccessLevelMapping({
      guest: platformGuestGroupPaths,
      developer: [],
      maintainer: [],
      admin: platformAdminGroupPaths,
    })

    const projectRoles = generateHarborAccessLevelMapping({
      guest: projectGuestGroupPaths,
      developer: projectDeveloperGroupPaths,
      maintainer: projectMaintainerGroupPaths,
      admin: projectAdminGroupPaths,
    })
    return new Map([
      [`/${project.slug}`, HARBOR_ROLE_LIMITED_GUEST],
      ...platformRoles,
      ...projectRoles,
    ])
  }
}

function getPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}

function parseGroupPaths(raw: string): string[] {
  return raw
    .split(',')
    .map(path => path.trim())
    .filter(Boolean)
}

function generateProjectRoleGroupPath(projectSlug: string, rawGroupPathSuffixes: string) {
  return parseGroupPaths(rawGroupPathSuffixes).map(path => `/${projectSlug}${path}`)
}

function generateHarborAccessLevelMapping(args: { guest: string[], developer: string[], maintainer: string[], admin: string[] }) {
  const byGroupName = new Map<string, number>()
  for (const groupName of args.guest) byGroupName.set(groupName, HARBOR_ROLE_GUEST)
  for (const groupName of args.developer) byGroupName.set(groupName, HARBOR_ROLE_DEVELOPER)
  for (const groupName of args.maintainer) byGroupName.set(groupName, HARBOR_ROLE_MAINTAINER)
  for (const groupName of args.admin) byGroupName.set(groupName, HARBOR_ROLE_PROJECT_ADMIN)
  return byGroupName
}

function daysAgoFromNow(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function generateRobotFullName(project: ProjectWithDetails, robotName: string) {
  return `robot$${project.slug}+${robotName}`
}

function generateRobotPermissions(project: ProjectWithDetails, robotName: string, access: HarborAccess[]): HarborRobotCreateRequest {
  return {
    name: robotName,
    duration: -1,
    description: 'robot for ci builds',
    disable: false,
    level: 'project',
    permissions: [{
      namespace: project.slug,
      kind: 'project',
      access,
    }],
  }
}

function generateRetentionPolicy(
  projectId: number,
  options: {
    harborRuleTemplate?: string
    harborRuleCount?: string
    harborRetentionCron?: string
  },
): HarborRetentionPolicy {
  let template: RuleTemplate = 'latestPushedK'
  if (isRuleTemplate(options.harborRuleTemplate)) {
    template = options.harborRuleTemplate
  }

  const rawCount = Number(options.harborRuleCount)
  let count: number
  if (Number.isFinite(rawCount) && rawCount > 0) {
    count = rawCount
  } else if (template === 'always') {
    count = 1
  } else {
    count = 10
  }

  return {
    algorithm: 'or',
    scope: { level: 'project', ref: projectId },
    rules: [
      {
        disabled: false,
        action: 'retain',
        template,
        params: { [template]: count },
        tag_selectors: [
          { kind: 'doublestar', decoration: 'matches', pattern: '**' },
        ],
        scope_selectors: {
          repository: [
            { kind: 'doublestar', decoration: 'repoMatches', pattern: '**' },
          ],
        },
      },
    ],
    trigger: {
      kind: 'Schedule',
      settings: { cron: options.harborRetentionCron },
      references: [],
    },
  }
}

function isRuleTemplate(value: unknown): value is RuleTemplate {
  if (typeof value !== 'string') return false
  for (const template of allowedRuleTemplates) {
    if (template === value) return true
  }
  return false
}
