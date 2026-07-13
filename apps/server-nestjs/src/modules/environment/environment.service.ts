import type { CreateEnvironment, UpdateEnvironment } from '@cpn-console/shared'
import type { Environment } from '@prisma/client'
import type { EventLogAction } from '../events/app-events.service'
import type { EnvironmentWithCluster, EnvironmentWithStage } from './environment-datastore.service'
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { AppEventsService } from '../events/app-events.service'
import { EnvironmentDatastoreService } from './environment-datastore.service'
import { EnvironmentValidationService } from './environment-validation.service'

@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name)

  constructor(
    @Inject(EnvironmentDatastoreService) private readonly environmentDatastoreService: EnvironmentDatastoreService,
    @Inject(EnvironmentValidationService) private readonly environmentValidationService: EnvironmentValidationService,
    @Inject(AppEventsService) private readonly appEvents: AppEventsService,
  ) {}

  async listByProjectId(projectId: string): Promise<EnvironmentWithStage[]> {
    return this.environmentDatastoreService.getEnvironmentsByProjectId(projectId)
  }

  async createEnvironment(projectId: string, environmentToCreate: CreateEnvironment, userId: string, requestId: string): Promise<Environment> {
    await this.environmentValidationService.validateCreate(projectId, environmentToCreate)

    const environment = await this.environmentDatastoreService.createEnvironment({
      projectId,
      name: environmentToCreate.name,
      clusterId: environmentToCreate.clusterId,
      stageId: environmentToCreate.stageId,
      cpu: environmentToCreate.cpu,
      gpu: environmentToCreate.gpu,
      memory: environmentToCreate.memory,
      autosync: environmentToCreate.autosync,
    })

    this.reconcileProject(projectId, 'Create Environment', userId, requestId)
    return environment
  }

  async updateEnvironment(projectId: string, environmentId: string, environmentToUpdate: UpdateEnvironment, userId: string, requestId: string): Promise<Environment> {
    const existingEnvironment = await this.getProjectEnvironmentOrThrow(projectId, environmentId)
    await this.environmentValidationService.validateUpdate(existingEnvironment, environmentToUpdate)

    const environment = await this.environmentDatastoreService.updateEnvironment(environmentId, {
      cpu: environmentToUpdate.cpu,
      gpu: environmentToUpdate.gpu,
      memory: environmentToUpdate.memory,
      autosync: environmentToUpdate.autosync,
    })

    this.reconcileProject(projectId, 'Update Environment', userId, requestId)
    return environment
  }

  async deleteEnvironment(projectId: string, environmentId: string, userId: string, requestId: string): Promise<void> {
    await this.getProjectEnvironmentOrThrow(projectId, environmentId)
    await this.environmentDatastoreService.deleteEnvironment(environmentId)
    this.reconcileProject(projectId, 'Delete Environment', userId, requestId)
  }

  private async getProjectEnvironmentOrThrow(projectId: string, environmentId: string): Promise<EnvironmentWithCluster> {
    const environment = await this.environmentDatastoreService.getProjectEnvironment(projectId, environmentId)
    if (!environment) {
      throw new NotFoundException('Environnement introuvable')
    }
    return environment
  }

  /**
   * Triggers the project reconciliation without blocking the response: listener
   * outcomes (including failures) are persisted in the admin log by AppEventsService.
   */
  private reconcileProject(projectId: string, action: EventLogAction, userId: string, requestId: string): void {
    this.appEvents.emitProjectEvent('project.upsert', projectId, { action, userId, requestId })
      .catch((error: unknown) => {
        this.logger.error(`project.upsert reconciliation failed (projectId=${projectId})`, error instanceof Error ? error.stack : String(error))
      })
  }
}
