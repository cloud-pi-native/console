import type { ProjectWithDetails } from './registry-datastore.service'
import { specificallyEnabled } from '@cpn-console/hooks'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { REGISTRY_CONFIG_KEYS } from './registry.constants'
import { parseBytes } from './registry.utils'

function getPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}
@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name)

  constructor(
    @Inject(RegistryClientService) private readonly client: RegistryClientService,
    @Inject(RegistryDatastoreService) private readonly registryDatastore: RegistryDatastoreService,
  ) {
    this.logger.log('RegistryService initialized')
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
    await this.client.provisionProject(project.slug, { storageLimitBytes, publishProjectRobot })
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.client.deleteProject(project.slug)
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
