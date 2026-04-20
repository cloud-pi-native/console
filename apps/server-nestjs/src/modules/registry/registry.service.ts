import type {
  HarborAccess,
  HarborGroupMemberRequest,
  HarborMember,
  HarborProjectQuota,
  HarborRetentionPolicy,
  HarborRobotCreated,
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
import { VaultClientService } from '../vault/vault-client.service'
import { VaultError } from '../vault/vault-http-client.service.js'
import { projectRobotName, RegistryClientService, roAccess, roRobotName, rwAccess, rwRobotName } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { REGISTRY_CONFIG_KEYS } from './registry.constants'
import { getHostFromUrl, getProjectVaultPath, parseBytes, toVaultRobotSecret } from './registry.utils'

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

  private async getRobot(projectSlug: string, robotName: string) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.robot.name': robotName,
    })
    const robots = await this.client.getProjectRobots(projectSlug)
    if (robots.status !== 200 || !robots.data) return undefined
    const fullName = generateRobotFullName(projectSlug, robotName)
    return robots.data.find(r => r?.name === fullName)
  }

  private async createProjectRobot(projectSlug: string, robotName: string, access: HarborAccess[]) {
    const created = await this.client.createRobot(
      generateRobotPermissions(projectSlug, robotName, access),
    )
    if (created.status >= 300 || !created.data) {
      throw new Error(`Harbor create robot failed (${created.status})`)
    }
    return created.data as HarborRobotCreated
  }

  private async regenerateRobot(projectSlug: string, robotName: string, access: HarborAccess[]) {
    const existing = await this.getRobot(projectSlug, robotName)
    if (existing?.id) {
      await this.client.deleteRobot(projectSlug, existing.id)
    }
    return this.createProjectRobot(projectSlug, robotName, access)
  }

  private async ensureRobotSecret(projectSlug: string, robotName: string, access: HarborAccess[]) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.robot.name': robotName,
    })
    if (!this.config.projectRootDir) {
      throw new Error('PROJECTS_ROOT_DIR is required')
    }
    const relativeVaultPath = `REGISTRY/${robotName}`
    const vaultPath = getProjectVaultPath(this.config.projectRootDir, projectSlug, relativeVaultPath)
    let vaultRobotSecret: VaultRobotSecret | null = null
    try {
      const secret = await this.vault.read(vaultPath)
      vaultRobotSecret = secret.data as VaultRobotSecret
    } catch (error) {
      if (!(error instanceof VaultError && error.kind === 'NotFound')) {
        throw error
      }
    }

    if (vaultRobotSecret?.HOST === this.host) {
      span?.setAttribute('vault.secret.reused', true)
      return vaultRobotSecret
    }

    const existing = await this.getRobot(projectSlug, robotName)
    const created = existing
      ? await this.regenerateRobot(projectSlug, robotName, access)
      : await this.createProjectRobot(projectSlug, robotName, access)
    const fullName = generateRobotFullName(projectSlug, robotName)
    const secret = toVaultRobotSecret(this.host, fullName, created.secret)
    await this.vault.write(secret, vaultPath)
    span?.setAttribute('vault.secret.written', true)
    return secret
  }

  private async ensureProjectGroupMember(projectSlug: string, groupName: string, accessLevel: number = 3) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.group.name': groupName,
      'registry.group.access_level': accessLevel,
    })
    const members = await this.client.getGroupMembers(projectSlug)
    if (members.status !== 200 || !members.data) {
      throw new Error(`Harbor list members failed (${members.status})`)
    }
    const list: HarborMember[] = members.data
    const existing = list.find(m => m?.entity_name === groupName)

    if (existing?.id) {
      if (existing.role_id !== accessLevel && existing.entity_type !== 'g') {
        await this.client.removeGroupMember(projectSlug, Number(existing.id))
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

  private async ensureProjectQuota(projectSlug: string, storageLimit: number) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.storage_limit.bytes': storageLimit,
    })
    const existing = await this.client.getProjectByName(projectSlug)
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

    const created = await this.client.createProject(projectSlug, storageLimit)
    if (created.status >= 300) {
      throw new Error(`Harbor create project failed (${created.status})`)
    }
    span?.setAttribute('registry.project.created', true)

    const fetched = await this.client.getProjectByName(projectSlug)
    if (fetched.status !== 200 || !fetched.data) {
      throw new Error(`Harbor get project failed (${fetched.status})`)
    }
    return fetched.data
  }

  private async ensureRetentionPolicy(projectSlug: string, projectId: number) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.project.id': projectId,
    })
    const policy = generateRetentionPolicy(projectId, {
      harborRuleTemplate: this.config.harborRuleTemplate,
      harborRuleCount: this.config.harborRuleCount,
      harborRetentionCron: this.config.harborRetentionCron,
    })
    const retentionId = await this.client.getRetentionId(projectSlug)
    span?.setAttribute('registry.retention.exists', !!retentionId)
    const result = retentionId
      ? await this.client.updateRetention(retentionId, policy)
      : await this.client.createRetention(policy)
    if (result.status >= 300) {
      throw new Error(`Harbor retention policy failed (${result.status})`)
    }
  }

  @StartActiveSpan()
  async ensureProject(projectSlug: string, options: { storageLimitBytes?: number, publishProjectRobot?: boolean } = {}) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.publish_project_robot': !!options.publishProjectRobot,
    })
    const storageLimit = options.storageLimitBytes ?? -1
    const project = await this.ensureProjectQuota(projectSlug, storageLimit)
    const projectId = Number(project.project_id)

    const groupName = `/${projectSlug}`

    await Promise.all([
      this.ensureRobotSecret(projectSlug, roRobotName, roAccess),
      this.ensureRobotSecret(projectSlug, rwRobotName, rwAccess),
      this.ensureProjectGroupMember(projectSlug, groupName),
      Number.isFinite(projectId) ? this.ensureRetentionPolicy(projectSlug, projectId) : Promise.resolve(),
      options.publishProjectRobot
        ? this.ensureRobotSecret(projectSlug, projectRobotName, roAccess)
        : Promise.resolve(),
    ])

    return {
      projectId: Number.isFinite(projectId) ? projectId : undefined,
      basePath: `${this.host}/${projectSlug}/`,
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
    const quotaConfigRaw = getPluginConfig(project, REGISTRY_CONFIG_KEYS.quotaHardLimit)
    const publishConfig = getPluginConfig(project, REGISTRY_CONFIG_KEYS.publishProjectRobot)
    const parsedQuota = quotaConfigRaw ? parseBytes(String(quotaConfigRaw)) : undefined
    const storageLimitBytes = parsedQuota === 1 ? -1 : parsedQuota ?? -1
    const publishProjectRobot = specificallyEnabled(publishConfig)
    await this.ensureProject(project.slug, { storageLimitBytes, publishProjectRobot })
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
    await Promise.all(projects.map(p => this.handleUpsert(p)))
  }
}

function getPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}

function generateRobotFullName(projectSlug: string, robotName: string) {
  return `robot$${projectSlug}+${robotName}`
}

function generateRobotPermissions(projectSlug: string, robotName: string, access: HarborAccess[]): HarborRobotCreateRequest {
  return {
    name: robotName,
    duration: -1,
    description: 'robot for ci builds',
    disable: false,
    level: 'project',
    permissions: [{
      namespace: projectSlug,
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
  const template = allowedRuleTemplates.includes(options.harborRuleTemplate as RuleTemplate)
    ? options.harborRuleTemplate as RuleTemplate
    : 'latestPushedK'

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
