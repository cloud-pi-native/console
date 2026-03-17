import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { VaultService } from '../vault/vault.service'
import { VaultError } from '../vault/vault-client.service'
import { RegistryClientService } from './registry-client.service'
import { getHostFromUrl, getProjectVaultPath, toVaultRobotSecret } from './registry.utils'
import type { VaultRobotSecret } from './registry.utils'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'

export interface HarborAccess {
  resource: string
  action: string
}

export const roRobotName = 'ro-robot'
export const rwRobotName = 'rw-robot'
export const projectRobotName = 'project-robot'

export const roAccess: HarborAccess[] = [
  { resource: 'repository', action: 'pull' },
  { resource: 'artifact', action: 'read' },
]

export const rwAccess: HarborAccess[] = [
  ...roAccess,
  { resource: 'repository', action: 'list' },
  { resource: 'tag', action: 'list' },
  { resource: 'artifact', action: 'list' },
  { resource: 'scan', action: 'create' },
  { resource: 'scan', action: 'stop' },
  { resource: 'repository', action: 'push' },
  { resource: 'artifact-label', action: 'create' },
  { resource: 'artifact-label', action: 'delete' },
  { resource: 'tag', action: 'create' },
  { resource: 'tag', action: 'delete' },
]

interface HarborProject {
  project_id?: number
  metadata?: Record<string, any>
}

interface HarborRobot {
  id?: number
  name?: string
}

interface HarborRobotCreated {
  id?: number
  name: string
  secret: string
}

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
  constructor(
    @Inject(RegistryClientService) private readonly client: RegistryClientService,
    @Inject(VaultService) private readonly vault: VaultService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  private get harborHost() {
    return getHostFromUrl(this.config.harborUrl!)
  }

  private getRobotFullName(projectSlug: string, robotName: string) {
    return `robot$${projectSlug}+${robotName}`
  }

  private async getRobot(projectSlug: string, robotName: string): Promise<HarborRobot | undefined> {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.robot.name': robotName,
    })
    const robots = await this.client.listProjectRobots(projectSlug)
    if (robots.status !== 200 || !robots.data) return undefined
    const fullName = this.getRobotFullName(projectSlug, robotName)
    return (robots.data as any[]).find(r => r?.name === fullName)
  }

  private getRobotPermissions(projectSlug: string, robotName: string, access: HarborAccess[]) {
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

  private async createRobot(projectSlug: string, robotName: string, access: HarborAccess[]): Promise<HarborRobotCreated> {
    const created = await this.client.createRobot(
      this.getRobotPermissions(projectSlug, robotName, access),
    )
    if (created.status >= 300 || !created.data) {
      throw new Error(`Harbor create robot failed (${created.status})`)
    }
    return created.data as HarborRobotCreated
  }

  private async regenerateRobot(projectSlug: string, robotName: string, access: HarborAccess[]): Promise<HarborRobotCreated> {
    const existing = await this.getRobot(projectSlug, robotName)
    if (existing?.id) {
      await this.client.deleteRobot(projectSlug, existing.id)
    }
    return this.createRobot(projectSlug, robotName, access)
  }

  private async ensureRobot(projectSlug: string, robotName: string, access: HarborAccess[]): Promise<VaultRobotSecret> {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.robot.name': robotName,
    })
    const relativeVaultPath = `REGISTRY/${robotName}`
    const vaultPath = getProjectVaultPath(this.config.projectRootPath, projectSlug, relativeVaultPath)
    let vaultRobotSecret: VaultRobotSecret | null = null
    try {
      const secret = await this.vault.read(vaultPath)
      vaultRobotSecret = secret.data as VaultRobotSecret
    } catch (error) {
      if (!(error instanceof VaultError && error.kind === 'NotFound')) {
        throw error
      }
    }

    if (vaultRobotSecret?.HOST === this.harborHost) {
      span?.setAttribute('vault.secret.reused', true)
      return vaultRobotSecret
    }

    const existing = await this.getRobot(projectSlug, robotName)
    const created = existing
      ? await this.regenerateRobot(projectSlug, robotName, access)
      : await this.createRobot(projectSlug, robotName, access)
    const fullName = this.getRobotFullName(projectSlug, robotName)
    const secret = toVaultRobotSecret(this.harborHost, fullName, created.secret)
    await this.vault.write(secret, vaultPath)
    span?.setAttribute('vault.secret.written', true)
    return secret
  }

  async addProjectGroupMember(projectSlug: string, groupName: string, accessLevel: number = 3) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.group.name': groupName,
      'registry.group.access_level': accessLevel,
    })
    const members = await this.client.listProjectMembers(projectSlug)
    if (members.status !== 200 || !members.data) {
      throw new Error(`Harbor list members failed (${members.status})`)
    }
    const list = members.data as any[]
    const existing = list.find(m => m?.entity_name === groupName)

    if (existing?.id) {
      if (existing.role_id !== accessLevel && existing.entity_type !== 'g') {
        await this.client.deleteProjectMember(projectSlug, Number(existing.id))
      } else {
        span?.setAttribute('registry.member.exists', true)
        return
      }
    }

    const created = await this.client.createProjectMember(projectSlug, {
      role_id: accessLevel,
      member_group: {
        group_name: groupName,
        group_type: 3,
      },
    })
    if (created.status >= 300) {
      throw new Error(`Harbor create member failed (${created.status})`)
    }
    span?.setAttribute('registry.member.created', true)
  }

  private async createOrUpdateProject(projectSlug: string, storageLimit: number): Promise<HarborProject> {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.storage_limit.bytes': storageLimit,
    })
    const existing = await this.client.getProjectByName(projectSlug)
    if (existing.status === 200 && existing.data) {
      const project = existing.data as HarborProject
      const projectId = Number(project.project_id)
      if (!Number.isFinite(projectId)) return project

      const quotas = await this.client.listQuotas(projectId)
      if (quotas.status === 200 && quotas.data) {
        const hardQuota = (quotas.data as any[]).find(q => q?.ref?.id === projectId)
        if (hardQuota?.hard?.storage !== storageLimit) {
          await this.client.updateQuota(projectId, storageLimit)
          span?.setAttribute('registry.quota.updated', true)
        }
      }
      return project
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
    return fetched.data as HarborProject
  }

  private getRetentionPolicy(projectId: number) {
    const template = allowedRuleTemplates.includes(this.config.harborRuleTemplate as RuleTemplate)
      ? this.config.harborRuleTemplate as RuleTemplate
      : 'latestPushedK'

    const rawCount = Number(this.config.harborRuleCount)
    const count = Number.isFinite(rawCount) && rawCount > 0
      ? rawCount
      : template === 'always'
        ? 1
        : 10

    const cron = this.config.harborRetentionCron?.trim() || '0 22 2 * * *'

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
        settings: { cron },
        references: [],
      },
    }
  }

  private async upsertRetentionPolicy(projectSlug: string, projectId: number) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.project.id': projectId,
    })
    const policy = this.getRetentionPolicy(projectId)
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
  async provisionProject(projectSlug: string, options: { storageLimitBytes?: number, publishProjectRobot?: boolean } = {}) {
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'registry.publish_project_robot': !!options.publishProjectRobot,
    })
    const storageLimit = options.storageLimitBytes ?? -1
    const project = await this.createOrUpdateProject(projectSlug, storageLimit)
    const projectId = Number(project.project_id)

    const groupName = `/${projectSlug}`

    await Promise.all([
      this.ensureRobot(projectSlug, roRobotName, roAccess),
      this.ensureRobot(projectSlug, rwRobotName, rwAccess),
      this.addProjectGroupMember(projectSlug, groupName),
      Number.isFinite(projectId) ? this.upsertRetentionPolicy(projectSlug, projectId) : Promise.resolve(),
      options.publishProjectRobot
        ? this.ensureRobot(projectSlug, projectRobotName, roAccess)
        : Promise.resolve(),
    ])

    return {
      projectId: Number.isFinite(projectId) ? projectId : undefined,
      basePath: `${this.harborHost}/${projectSlug}/`,
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
    const deleted = await this.client.deleteProject(projectSlug)
    if (deleted.status >= 300 && deleted.status !== 404) {
      throw new Error(`Harbor delete project failed (${deleted.status})`)
    }
  }
}
