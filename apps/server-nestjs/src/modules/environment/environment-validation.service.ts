import type { CreateEnvironment, UpdateEnvironment } from '@cpn-console/shared'
import type { Cluster, Prisma, Project } from '@prisma/client'
import type { EnvironmentWithCluster } from './environment-datastore.service'
import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { EnvironmentDatastoreService } from './environment-datastore.service'
import { PROD_STAGE_NAME } from './environment.constants'

interface EnvironmentResources {
  cpu: number
  gpu: number
  memory: number
}

/** cpu and memory both at 0 mean the limits were never configured, so quota checks do not apply. */
function areResourceLimitsConfigured(limit: EnvironmentResources): boolean {
  return limit.cpu !== 0 || limit.memory !== 0
}

/**
 * Business rules for environments: name unicity, stage and cluster validity,
 * cluster and project resource quotas. Existence/ownership (404) concerns stay
 * in EnvironmentService; this service only decides whether a request is allowed (400).
 */
@Injectable()
export class EnvironmentValidationService {
  constructor(
    @Inject(EnvironmentDatastoreService) private readonly environmentDatastoreService: EnvironmentDatastoreService,
  ) {}

  async validateCreate(projectId: string, input: CreateEnvironment): Promise<void> {
    const errorMessages: string[] = []
    const [stage, sameNameEnvironment, cluster] = await Promise.all([
      this.environmentDatastoreService.getStageById(input.stageId),
      this.environmentDatastoreService.getEnvironmentByName(projectId, input.name),
      this.environmentDatastoreService.getAvailableCluster(input.clusterId, projectId),
    ])

    if (sameNameEnvironment) errorMessages.push('Ce nom d\'environnement est déjà pris.')
    if (!stage) errorMessages.push('Type d\'environnement invalide.')
    if (cluster) {
      const clusterError = await this.checkClusterResources(input, cluster)
      if (clusterError) errorMessages.push(clusterError)

      const project = await this.environmentDatastoreService.getProjectById(projectId)
      const projectError = await this.checkProjectResources(input, input.stageId, project)
      if (projectError) errorMessages.push(projectError)
    } else {
      errorMessages.push('Cluster invalide.')
    }

    if (errorMessages.length > 0) {
      throw new BadRequestException(errorMessages.join('\n'))
    }
  }

  async validateUpdate(environment: EnvironmentWithCluster, input: UpdateEnvironment): Promise<void> {
    const errorMessages: string[] = []
    const clusterError = await this.checkClusterResources(input, environment.cluster)
    if (clusterError) errorMessages.push(clusterError)

    const project = await this.environmentDatastoreService.getProjectById(environment.projectId)
    const projectError = await this.checkProjectResources(input, environment.stageId, project)
    if (projectError) errorMessages.push(projectError)

    if (errorMessages.length > 0) {
      throw new BadRequestException(errorMessages.join('\n'))
    }
  }

  private async checkClusterResources(request: EnvironmentResources, cluster: Cluster): Promise<string | undefined> {
    const overflowResources = await this.getOverflowResources({
      request,
      limit: { cpu: cluster.cpu, gpu: cluster.gpu, memory: cluster.memory },
      where: { clusterId: cluster.id },
    })
    if (overflowResources.length > 0) {
      return `Le cluster ne dispose pas de suffisamment de ressources : ${overflowResources.join(', ')}.`
    }
    return undefined
  }

  private async checkProjectResources(request: EnvironmentResources, stageId: string, project: Project): Promise<string | undefined> {
    if (project.limitless) {
      // No limits
      return undefined
    }
    const [stage, prodStages] = await Promise.all([
      this.environmentDatastoreService.getStageById(stageId),
      this.environmentDatastoreService.getProdStageIds(),
    ])
    const prodStageIds = prodStages.map(s => s.id)

    let overflowResources: string[]
    if (stage?.name === PROD_STAGE_NAME) {
      overflowResources = await this.getOverflowResources({
        request,
        limit: { cpu: project.prodCpu, gpu: project.prodGpu, memory: project.prodMemory },
        where: {
          projectId: project.id,
          stageId: { in: prodStageIds },
        },
      })
    } else { // hprod
      overflowResources = await this.getOverflowResources({
        request,
        limit: { cpu: project.hprodCpu, gpu: project.hprodGpu, memory: project.hprodMemory },
        where: {
          projectId: project.id,
          stageId: { notIn: prodStageIds },
        },
      })
    }
    if (overflowResources.length > 0) {
      return `Le projet ne dispose pas de suffisamment de ressources : ${overflowResources.join(', ')}.`
    }
    return undefined
  }

  private async getOverflowResources({ request, limit, where }: {
    request: EnvironmentResources
    limit: EnvironmentResources
    where: Prisma.EnvironmentWhereInput
  }): Promise<string[]> {
    if (!areResourceLimitsConfigured(limit)) {
      return []
    }
    const environmentResources = await this.environmentDatastoreService.sumEnvironmentResources(where)
    // A null sum means no environment matched: nothing is consumed yet.
    const insufficientResources: string[] = []
    if ((environmentResources._sum.cpu ?? 0) + request.cpu > limit.cpu) {
      insufficientResources.push('CPU')
    }
    if ((environmentResources._sum.gpu ?? 0) + request.gpu > limit.gpu) {
      insufficientResources.push('GPU')
    }
    if ((environmentResources._sum.memory ?? 0) + request.memory > limit.memory) {
      insufficientResources.push('Mémoire')
    }
    return insufficientResources
  }
}
