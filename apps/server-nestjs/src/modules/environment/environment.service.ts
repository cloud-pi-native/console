import type { CreateEnvironment, UpdateEnvironment } from '@cpn-console/shared'
import type { Environment } from '@prisma/client'
import type { EventLogAction } from '../events/app-events.service'
import type { EnvironmentWithCluster, EnvironmentWithStage } from './environment-datastore.service'
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { AppEventsService } from '../events/app-events.service'
import { getFailedPlugins } from '../plugin/plugin.utils'
import { EnvironmentDatastoreService } from './environment-datastore.service'
import { EnvironmentValidationService } from './environment-validation.service'

@Injectable()
export class EnvironmentService {
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

    await this.reconcileProjectAndThrowOnFailure(
      projectId,
      'Create Environment',
      userId,
      requestId,
      'Echec des services à la création de l\'environnement',
    )
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

    await this.reconcileProjectAndThrowOnFailure(
      projectId,
      'Update Environment',
      userId,
      requestId,
      'Echec des services à la mise à jour de l\'environnement',
    )
    return environment
  }

  async deleteEnvironment(projectId: string, environmentId: string, userId: string, requestId: string): Promise<void> {
    await this.getProjectEnvironmentOrThrow(projectId, environmentId)
    await this.environmentDatastoreService.deleteEnvironment(environmentId)
    await this.reconcileProjectAndThrowOnFailure(
      projectId,
      'Delete Environment',
      userId,
      requestId,
      'Echec des services à la suppression de l\'environnement',
    )
  }

  private async getProjectEnvironmentOrThrow(projectId: string, environmentId: string): Promise<EnvironmentWithCluster> {
    const environment = await this.environmentDatastoreService.getProjectEnvironment(projectId, environmentId)
    if (!environment) {
      throw new NotFoundException('Environnement introuvable')
    }
    return environment
  }

  /**
   * Runs the project reconciliation and waits for it before answering: an environment
   * change is only meaningful once the services have applied it, so a failing plugin
   * must surface in the response (legacy v1 behavior) instead of leaving the caller
   * with a success on a project that AppEventsService just marked `failed`. The row
   * change stays committed — the reconciliation is replayable.
   */
  private async reconcileProjectAndThrowOnFailure(
    projectId: string,
    action: EventLogAction,
    userId: string,
    requestId: string,
    failureMessage: string,
  ): Promise<void> {
    const results = await this.appEvents.emitProjectEvent('project.upsert', projectId, { action, userId, requestId })

    if (getFailedPlugins(results).length) {
      throw new InternalServerErrorException(failureMessage)
    }
  }
}
