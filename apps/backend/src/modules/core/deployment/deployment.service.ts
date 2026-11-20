import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { Deployment } from '@prisma/client'
import type { EventLogAction } from '../events/app-events.service'
import type { SerializedDeployment } from './deployment.utils'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { AppEventsService } from '../events/app-events.service'
import { DeploymentDatastoreService } from './deployment-datastore.service'
import {
  buildDeploymentSourceCreate,
  buildDeploymentSourceUpdate,
  parseCreateDeployment,
  parseUpdateDeployment,
  serializeDeployment,
} from './deployment.utils'

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name)

  constructor(
    @Inject(DeploymentDatastoreService) private readonly deploymentDatastoreService: DeploymentDatastoreService,
    @Inject(AppEventsService) private readonly appEvents: AppEventsService,
  ) {}

  async listByProjectId(projectId: string): Promise<SerializedDeployment[]> {
    const deployments = await this.deploymentDatastoreService.getDeploymentsByProjectId(projectId)
    return deployments.map(serializeDeployment)
  }

  async createDeployment(projectId: string, deploymentToCreate: CreateDeployment, userId: string, requestId: string): Promise<Deployment> {
    const model = parseCreateDeployment(deploymentToCreate)

    const deployment = await this.deploymentDatastoreService.createDeployment({
      name: model.name,
      project: { connect: { id: projectId } },
      autosync: model.autosync,
      environment: { connect: { id: model.environmentId } },
      deploymentSources: {
        create: model.deploymentSources.map(buildDeploymentSourceCreate),
      },
    })

    this.reconcileProject(projectId, 'Create Deployment', userId, requestId)
    return deployment
  }

  async updateDeployment(projectId: string, deploymentId: string, deploymentToUpdate: UpdateDeployment, userId: string, requestId: string): Promise<Deployment> {
    const existing = await this.deploymentDatastoreService.getDeploymentById(deploymentId)
    const model = parseUpdateDeployment(deploymentToUpdate)

    const keptDeploymentSourceIds = new Set(model.deploymentSourcesToUpdate.map(source => source.id))
    const deploymentSourceIdsToDelete = existing.deploymentSources
      .filter(source => !keptDeploymentSourceIds.has(source.id))
      .map(source => source.id)

    // Tracks which existing deployment sources already own an external value
    // source, so the update knows when it must delete a removed one.
    const sourcesWithExternal = new Set(
      existing.deploymentSources
        .filter(source => source.externalValueSource)
        .map(source => source.id),
    )

    const deployment = await this.deploymentDatastoreService.updateDeployment(deploymentId, {
      name: model.name,
      autosync: model.autosync,
      environment: { connect: { id: model.environmentId } },
      deploymentSources: {
        deleteMany: {
          id: { in: deploymentSourceIdsToDelete },
        },
        create: model.deploymentSourcesToCreate.map(buildDeploymentSourceCreate),
        update: model.deploymentSourcesToUpdate.map(source => ({
          where: { id: source.id },
          data: buildDeploymentSourceUpdate(source, sourcesWithExternal.has(source.id)),
        })),
      },
    })
    this.reconcileProject(projectId, 'Update Deployment', userId, requestId)
    return deployment
  }

  async deleteDeployment(projectId: string, deploymentId: string, userId: string, requestId: string): Promise<void> {
    await this.deploymentDatastoreService.deleteDeployment(deploymentId)
    this.reconcileProject(projectId, 'Delete Deployment', userId, requestId)
  }

  async deleteAllDeploymentsByProjectId(projectId: string): Promise<void> {
    await this.deploymentDatastoreService.deleteAllDeploymentsByProjectId(projectId)
    await this.appEvents.emitProjectEvent('project.upsert', projectId, { action: 'Delete all project deployments' })
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
