import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { VaultDatastoreService } from './vault-datastore.service'
import type { ProjectWithDetails, ZoneWithDetails } from './vault-datastore.service'
import { VaultService } from './vault.service'
import { trace } from '@opentelemetry/api'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'

@Injectable()
export class VaultControllerService {
  private readonly logger = new Logger(VaultControllerService.name)

  constructor(
    @Inject(VaultDatastoreService) private readonly vaultDatastore: VaultDatastoreService,
    @Inject(VaultService) private readonly vault: VaultService,
  ) {
    this.logger.log('VaultControllerService initialized')
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project upsert for ${project.slug}`)
    await this.ensureProject(project, 'event')
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project delete for ${project.slug}`)
    await Promise.all([
      this.vault.deleteProject(project.slug),
      this.vault.destroyProjectSecrets(project.slug),
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
    await this.vault.deleteZone(zone.slug)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    this.logger.log('Starting Vault reconciliation')
    const [projects, zones] = await Promise.all([
      this.vaultDatastore.getAllProjects(),
      this.vaultDatastore.getAllZones(),
    ])

    trace.getActiveSpan()?.setAttributes({
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
    await Promise.all(projects.map(p => this.ensureProject(p, 'cron')))
  }

  @StartActiveSpan()
  private async ensureProject(project: ProjectWithDetails, source: 'event' | 'cron') {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('reconcile.source', source)
    await this.vault.upsertProject(project)
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
    await this.vault.upsertZone(zone.slug)
  }
}
