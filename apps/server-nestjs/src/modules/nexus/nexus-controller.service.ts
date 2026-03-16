import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { specificallyEnabled } from '@cpn-console/hooks'

import { NexusDatastoreService } from './nexus-datastore.service'
import type { ProjectWithDetails } from './nexus-datastore.service'
import { NexusService } from './nexus.service'
import { NEXUS_CONFIG_KEYS } from './nexus.constants'
import { getPluginConfig } from './nexus.utils'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'

@Injectable()
export class NexusControllerService {
  private readonly logger = new Logger(NexusControllerService.name)

  constructor(
    @Inject(NexusDatastoreService) private readonly nexusDatastore: NexusDatastoreService,
    @Inject(NexusService) private readonly nexus: NexusService,
  ) {
    this.logger.log('NexusControllerService initialized')
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project upsert for ${project.slug}`)
    await this.reconcileProject(project)
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.nexus.deleteProject(project.slug)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    this.logger.log('Starting Nexus reconciliation')
    await this.reconcile()
  }

  @StartActiveSpan()
  async reconcile() {
    const projects = await this.nexusDatastore.getAllProjects()
    const span = trace.getActiveSpan()
    span?.setAttribute('nexus.projects.count', projects.length)

    const results = await Promise.allSettled(projects.map(project => this.reconcileProject(project)))
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logger.error(`Reconciliation failed: ${result.reason}`)
      }
    })
    return results
  }

  @StartActiveSpan()
  private async reconcileProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)

    const enableMaven = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEYS.activateMavenRepo)) === true
    const enableNpm = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEYS.activateNpmRepo)) === true

    await this.nexus.provisionProject({
      projectSlug: project.slug,
      ownerEmail: project.owner.email,
      enableMaven,
      enableNpm,
      mavenSnapshotWritePolicy: getPluginConfig(project, NEXUS_CONFIG_KEYS.mavenSnapshotWritePolicy) ?? undefined,
      mavenReleaseWritePolicy: getPluginConfig(project, NEXUS_CONFIG_KEYS.mavenReleaseWritePolicy) ?? undefined,
      npmWritePolicy: getPluginConfig(project, NEXUS_CONFIG_KEYS.npmWritePolicy) ?? undefined,
    })
  }
}
