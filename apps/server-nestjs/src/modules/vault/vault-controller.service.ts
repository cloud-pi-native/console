import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { VaultDatastoreService } from './vault-datastore.service'
import type { ProjectWithDetails } from './vault-datastore.service'
import { VaultService } from './vault.service'
import { trace } from '@opentelemetry/api'

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
        const result = await this.vault.upsertProject(project)
        if (result.error) {
          if (result.error.kind === 'NotConfigured') return
          throw new Error(`Vault upsertProject failed: ${result.error.kind}`)
        }
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
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
        const deleted = await this.vault.deleteProject(project.slug)
        if (deleted.error) {
          if (deleted.error.kind === 'NotConfigured') return
          throw new Error(`Vault deleteProject failed: ${deleted.error.kind}`)
        }

        const destroyed = await this.vault.destroyProjectSecrets(project.slug)
        if (destroyed.error) {
          if (destroyed.error.kind === 'NotConfigured') return
          throw new Error(`Vault destroyProjectSecrets failed: ${destroyed.error.kind}`)
        }
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
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

        const results = await Promise.allSettled([
          ...projects.map(async (p) => {
            const result = await this.vault.upsertProject(p)
            if (result.error) {
              if (result.error.kind === 'NotConfigured') return
              throw new Error(`Vault upsertProject failed: ${result.error.kind}`)
            }
          }),
          ...zones.map(async (z) => {
            const result = await this.vault.upsertZone(z.slug)
            if (result.error) {
              if (result.error.kind === 'NotConfigured') return
              throw new Error(`Vault upsertZone failed: ${result.error.kind}`)
            }
          }),
        ])

        results.forEach((result) => {
          if (result.status === 'rejected') {
            this.logger.error(`Reconciliation failed: ${result.reason}`)
          }
        })
      } catch (error) {
        if (error instanceof Error) span.recordException(error)
        throw error
      } finally {
        span.end()
      }
    })
  }
}
