import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { InputJsonValue } from '@prisma/client/runtime/library'
import type { ProjectExecutionContext } from '../infrastructure/permission/project/project-context.decorator'
import type { RequiredServiceResult } from '../plugin/plugin.utils'
import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { LogService } from '../log/log.service'
import { getFailedServices, mergeServiceResults } from '../plugin/plugin.utils'
import { ProjectService } from '../project/project.service'
import { DeploymentDatastoreService } from './deployment-datastore.service'

type DeploymentAction = 'Create Deployment'
  | 'Update Deployment'
  | 'Delete Deployment'

interface UpdateArgoCDProjectOptions {
  projectId: string
  userId: string
  requestId: string
  action: DeploymentAction
}

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name)

  constructor(
    @Inject(DeploymentDatastoreService) private readonly deploymentDatastoreService: DeploymentDatastoreService,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(LogService) private readonly logService: LogService,
  ) {}

  async listByProjectId(projectId: string) {
    return this.deploymentDatastoreService.getDeploymentsByProjectId(projectId)
  }

  async createDeployment(projectCtx: ProjectExecutionContext, deploymentToCreate: CreateDeployment) {
    const { projectId, userId, requestId } = projectCtx
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

    await this.updateArgoCDProject({
      projectId,
      userId,
      requestId,
      action: 'Create Deployment',
    })
    return deployment
  }

  async updateDeployment(projectCtx: ProjectExecutionContext, deploymentId: string, deploymentToUpdate: UpdateDeployment) {
    const { projectId, userId, requestId } = projectCtx
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
    await this.updateArgoCDProject({
      projectId,
      userId,
      requestId,
      action: 'Update Deployment',
    })
    return deployment
  }

  async deleteDeployment(projectCtx: ProjectExecutionContext, deploymentId: string) {
    const { projectId, userId, requestId } = projectCtx
    await this.deploymentDatastoreService.deleteDeployment(deploymentId)
    await this.updateArgoCDProject({
      projectId,
      userId,
      requestId,
      action: 'Delete Deployment',
    })
  }

  private async updateArgoCDProject(args: UpdateArgoCDProjectOptions) {
    const { projectId, userId, requestId, action } = args
    const projectWithDetails = await this.projectService.getProjectWithDetails(projectId)

    this.logger.log(`project.argocd.update started (projectId=${projectId})`)
    const eventResults: RequiredServiceResult<'argocd'>[] = await this.eventEmitter.emitAsync('project.argocd.update', projectWithDetails)
    const results = mergeServiceResults(eventResults)
    const failed = getFailedServices(results)

    await this.logService.addLog({
      action,
      data: {
        args: {
          ...projectWithDetails,
        },
        failed: failed.length > 0 ? failed : undefined,
        results: results as InputJsonValue,
      },
      userId,
      requestId,
      projectId,
    })

    if (failed.length > 0) {
      this.logger.error(`project.argocd.update failed (projectId=${projectId})`)
      throw new InternalServerErrorException('Synchronization Argo CD Failed')
    }

    this.logger.log(`project.argocd.update completed (projectId=${projectId})`)
  }
}
