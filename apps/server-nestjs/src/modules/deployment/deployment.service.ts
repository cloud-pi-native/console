import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ProjectService } from '../project/project.service'
import { DeploymentDatastoreService } from './deployment-datastore.service'

@Injectable()
export class DeploymentService {
  constructor(
    @Inject(DeploymentDatastoreService) private readonly deploymentDatastoreService: DeploymentDatastoreService,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  async listByProjectId(projectId: string) {
    return this.deploymentDatastoreService.getDeploymentsByProjectId(projectId)
  }

  async createDeployment(projectId: string, deploymentToCreate: CreateDeployment) {
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

    await this.upsertProject(projectId)
    // TODO handle result and add logs
    return deployment
  }

  async updateDeployment(deploymentId: string, deploymentToUpdate: UpdateDeployment) {
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
    await this.upsertProject(deploymentToUpdate.projectId)
    // TODO handle result and add logs
    return deployment
  }

  async deleteDeployment(deploymentId: string) {
    const deployment = await this.deploymentDatastoreService.deleteDeployment(deploymentId)
    await this.upsertProject(deployment.projectId)
    // TODO handle result and add logs
  }

  async deleteAllDeploymentsByProjectId(projectId: string) {
    await this.deploymentDatastoreService.deleteAllDeploymentsByProjectId(projectId)
    await this.upsertProject(projectId)
    // TODO handle result and add logs
  }

  private async upsertProject(projectId: string) {
    const projectWithDetails = await this.projectService.getProjectWithDetails(projectId)

    await this.eventEmitter.emitAsync('project.upsert', projectWithDetails)
  }
}
