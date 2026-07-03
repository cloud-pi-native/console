import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { EventLogAction } from '../events/app-events.service'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { AppEventsService } from '../events/app-events.service'
import { DeploymentDatastoreService } from './deployment-datastore.service'

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name)

  constructor(
    @Inject(DeploymentDatastoreService) private readonly deploymentDatastoreService: DeploymentDatastoreService,
    @Inject(AppEventsService) private readonly appEvents: AppEventsService,
  ) {}

  async listByProjectId(projectId: string) {
    return this.deploymentDatastoreService.getDeploymentsByProjectId(projectId)
  }

  async createDeployment(projectId: string, deploymentToCreate: CreateDeployment, userId: string, requestId: string) {
    const deployment = await this.deploymentDatastoreService.createDeployment({
      name: deploymentToCreate.name,
      project: { connect: { id: projectId } },
      autosync: deploymentToCreate.autosync,
      environment: { connect: { id: deploymentToCreate.environmentId } },
      deploymentSources: {
        createMany: {
          data: deploymentToCreate.deploymentSources.map(({ type, repositoryId, targetRevision, path, helmValuesFiles }) => ({
            type,
            repositoryId,
            targetRevision,
            path,
            helmValuesFiles,
          })),
        },
      },
    })

    this.reconcileProject(projectId, 'Create Deployment', userId, requestId)
    return deployment
  }

  async updateDeployment(projectId: string, deploymentId: string, deploymentToUpdate: UpdateDeployment, userId: string, requestId: string) {
    const existing = await this.deploymentDatastoreService.getDeploymentById(deploymentId)
    if (!existing) throw new Error(`Deployment with id ${deploymentId} not found`)

    const incomingDeploymentSourceIds = new Set(
      deploymentToUpdate.deploymentSources
        .filter(s => s.id)
        .map(s => s.id),
    )

    const deploymentSourcesToDelete = existing.deploymentSources.filter(
      e => !incomingDeploymentSourceIds.has(e.id),
    )

    const deployment = await this.deploymentDatastoreService.updateDeployment(deploymentId, {
      name: deploymentToUpdate.name,
      autosync: deploymentToUpdate.autosync,
      environment: { connect: { id: deploymentToUpdate.environmentId } },
      deploymentSources: {
        deleteMany: {
          id: { in: deploymentSourcesToDelete.map(s => s.id) },
        },
        upsert: deploymentToUpdate.deploymentSources.map(source => ({
          where: { id: source.id ?? crypto.randomUUID() },
          update: {
            repository: { connect: { id: source.repositoryId } },
            type: source.type,
            targetRevision: source.targetRevision,
            path: source.path,
            helmValuesFiles: source.helmValuesFiles,
          },
          create: {
            repository: { connect: { id: source.repositoryId } },
            type: source.type,
            targetRevision: source.targetRevision,
            path: source.path,
            helmValuesFiles: source.helmValuesFiles,
          },
        })),
      },
    })
    this.reconcileProject(projectId, 'Update Deployment', userId, requestId)
    return deployment
  }

  async deleteDeployment(projectId: string, deploymentId: string, userId: string, requestId: string) {
    await this.deploymentDatastoreService.deleteDeployment(deploymentId)
    this.reconcileProject(projectId, 'Delete Deployment', userId, requestId)
  }

  async deleteAllDeploymentsByProjectId(projectId: string) {
    await this.deploymentDatastoreService.deleteAllDeploymentsByProjectId(projectId)
    await this.appEvents.emitProjectEvent('project.upsert', projectId, { action: 'Delete all project deployments' })
  }

  /**
   * Triggers the project reconciliation without blocking the response: listener
   * outcomes (including failures) are persisted in the admin log by AppEventsService.
   */
  private reconcileProject(projectId: string, action: EventLogAction, userId: string, requestId: string) {
    this.appEvents.emitProjectEvent('project.upsert', projectId, { action, userId, requestId })
      .catch((error: unknown) => {
        this.logger.error(`project.upsert reconciliation failed (projectId=${projectId})`, error instanceof Error ? error.stack : String(error))
      })
  }
}
