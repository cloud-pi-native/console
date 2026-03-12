import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { VaultDatastoreService } from './vault-datastore.service'
import type { ProjectWithDetails, ZoneWithDetails } from './vault-datastore.service'
import { VaultService } from './vault.service'
import { trace } from '@opentelemetry/api'
import { VaultError } from './vault-client.service'

const tracer = trace.getTracer('vault-controller-service')

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
  async handleUpsert(project: ProjectWithDetails) {
    return tracer.startActiveSpan('handleUpsert', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        this.logger.log(`Handling project upsert for ${project.slug}`)
        await this.ensureProject(project, 'event')
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  @OnEvent('project.delete')
  async handleDelete(project: ProjectWithDetails) {
    return tracer.startActiveSpan('handleDelete', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        this.logger.log(`Handling project delete for ${project.slug}`)
        try {
          await this.vault.deleteProject(project.slug)
        } catch (error) {
          if (error instanceof Error) {
            span.recordException(error)
          }
          throw error
          if (error instanceof VaultError && error.kind === 'NotConfigured') return
          this.logger.error('Vault deleteProject failed', error)
          return
        }

        try {
          await this.vault.destroyProjectSecrets(project.slug)
        } catch (error) {
          if (error instanceof Error) {
            span.recordException(error)
          }
          throw error
          if (error instanceof VaultError && error.kind === 'NotConfigured') return
          this.logger.error('Vault destroyProjectSecrets failed', error)
        }
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  @OnEvent('zone.upsert')
  async handleUpsertZone(zone: ZoneWithDetails) {
    return tracer.startActiveSpan('handleUpsertZone', async (span) => {
      try {
        span.setAttribute('zone.slug', zone.slug)
        this.logger.log(`Handling zone upsert for ${zone.slug}`)
        await this.ensureZone(zone)
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  @OnEvent('zone.delete')
  async handleDeleteZone(zone: ZoneWithDetails) {
    return tracer.startActiveSpan('handleDeleteZone', async (span) => {
      try {
        span.setAttribute('zone.slug', zone.slug)
        this.logger.log(`Handling zone delete for ${zone.slug}`)
        try {
          await this.vault.deleteZone(zone.slug)
        } catch (error) {
          if (error instanceof Error) {
            span.recordException(error)
          }
          throw error
          if (error instanceof VaultError && error.kind === 'NotConfigured') return
          this.logger.error('Vault deleteZone failed', error)
        }
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
      } finally {
        span.end()
      }
    })
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    return tracer.startActiveSpan('handleCron', async (span) => {
      try {
        this.logger.log('Starting Vault reconciliation')
        const [projects, zones] = await Promise.all([
          this.vaultDatastore.getAllProjects(),
          this.vaultDatastore.getAllZones(),
        ])

        span.setAttribute('vault.projects.count', projects.length)
        span.setAttribute('vault.zones.count', zones.length)
        await Promise.all([
          this.ensureProjects(projects),
          this.ensureZones(zones),
        ])
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
        this.logger.error('Vault reconciliation failed', error)
      } finally {
        span.end()
      }
    })
  }

  private async ensureProjects(projects: ProjectWithDetails[]) {
    return tracer.startActiveSpan('ensureProjects', async (span) => {
      try {
        span.setAttribute('vault.projects.count', projects.length)
        await Promise.all(projects.map(p => this.ensureProject(p, 'cron')))
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
        this.logger.error('Vault project reconciliation failed', error)
      } finally {
        span.end()
      }
    })
  }

  private async ensureProject(project: ProjectWithDetails, source: 'event' | 'cron') {
    return tracer.startActiveSpan('ensureProject', async (span) => {
      try {
        span.setAttribute('project.slug', project.slug)
        span.setAttribute('reconcile.source', source)
        try {
          await this.vault.upsertProject(project)
        } catch (error) {
          if (error instanceof Error) {
            span.recordException(error)
          }
          throw error
          if (error instanceof VaultError && error.kind === 'NotConfigured') return
          this.logger.error(`Vault upsertProject failed for ${project.slug}`, error)
        }
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
        this.logger.error(`Vault upsertProject failed for ${project.slug}`, error)
      } finally {
        span.end()
      }
    })
  }

  private async ensureZones(zones: ZoneWithDetails[]) {
    return tracer.startActiveSpan('ensureZones', async (span) => {
      try {
        span.setAttribute('vault.zones.count', zones.length)
        await Promise.all(zones.map(z => this.ensureZone(z)))
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
        this.logger.error('Vault zone reconciliation failed', error)
      } finally {
        span.end()
      }
    })
  }

  private async ensureZone(zone: ZoneWithDetails) {
    return tracer.startActiveSpan('ensureZone', async (span) => {
      try {
        span.setAttribute('zone.slug', zone.slug)
        try {
          await this.vault.upsertZone(zone.slug)
        } catch (error) {
          if (error instanceof Error) {
            span.recordException(error)
          }
          throw error
          if (error instanceof VaultError && error.kind === 'NotConfigured') return
          this.logger.error(`Vault upsertZone failed for ${zone.slug}`, error)
        }
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        throw error
        this.logger.error(`Vault upsertZone failed for ${zone.slug}`, error)
      } finally {
        span.end()
      }
    })
  }
}
