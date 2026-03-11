import { Inject, Injectable, Logger } from '@nestjs/common'
import type { OnApplicationBootstrap } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { VaultDatastoreService } from './vault-datastore.service'
import type { ProjectWithDetails } from './vault-datastore.service'
import { VaultService } from './vault.service'

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
    if (!this.vault.enabled) return
    this.logger.log(`Handling project upsert for ${project.slug}`)
    await this.vault.upsertProject(project)
  }

  @OnEvent('project.delete')
  async handleDelete(project: ProjectWithDetails) {
    if (!this.vault.enabled) return
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.vault.deleteProject(project.slug)
    await this.vault.destroyProjectSecrets(project.slug)
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    if (!this.vault.enabled) return
    this.logger.log('Starting Vault reconciliation')
    const [projects, zones] = await Promise.all([
      this.vaultDatastore.getAllProjects(),
      this.vaultDatastore.getAllZones(),
    ])

    const results = await Promise.allSettled([
      ...projects.map(p => this.vault.upsertProject(p)),
      ...zones.map(z => this.vault.upsertZone(z.slug)),
    ])

    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logger.error(`Reconciliation failed: ${result.reason}`)
      }
    })
  }
}
