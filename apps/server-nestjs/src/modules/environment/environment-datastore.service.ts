import type { Cluster, Environment, Prisma, Project, Stage } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { PROD_STAGE_NAME } from './environment.constants'

export type EnvironmentWithCluster = Environment & { cluster: Cluster }
export type EnvironmentWithStage = Environment & { stage: Stage }

export interface EnvironmentResourcesSum {
  _sum: {
    cpu: number | null
    gpu: number | null
    memory: number | null
  }
}

@Injectable()
export class EnvironmentDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getProjectEnvironment(projectId: string, environmentId: string): Promise<EnvironmentWithCluster | null> {
    return this.prisma.environment.findFirst({
      where: { id: environmentId, projectId },
      include: { cluster: true },
    })
  }

  getEnvironmentsByProjectId(projectId: string): Promise<EnvironmentWithStage[]> {
    return this.prisma.environment.findMany({
      where: { projectId },
      include: { stage: true },
    })
  }

  getEnvironmentByName(projectId: string, name: string): Promise<Environment | null> {
    return this.prisma.environment.findUnique({
      where: { projectId_name: { projectId, name } },
    })
  }

  getStageById(stageId: string): Promise<Stage | null> {
    return this.prisma.stage.findUnique({ where: { id: stageId } })
  }

  getProdStageIds(): Promise<{ id: string }[]> {
    return this.prisma.stage.findMany({
      select: { id: true },
      where: { name: PROD_STAGE_NAME },
    })
  }

  /** Only public clusters or dedicated clusters attached to the project are usable. */
  getAvailableCluster(clusterId: string, projectId: string): Promise<Cluster | null> {
    return this.prisma.cluster.findFirst({
      where: {
        OR: [{
          id: clusterId,
          privacy: 'public',
        }, {
          id: clusterId,
          privacy: 'dedicated',
          projects: { some: { id: projectId } },
        }],
      },
    })
  }

  getProjectById(projectId: string): Promise<Project> {
    return this.prisma.project.findUniqueOrThrow({ where: { id: projectId } })
  }

  sumEnvironmentResources(where: Prisma.EnvironmentWhereInput): Promise<EnvironmentResourcesSum> {
    return this.prisma.environment.aggregate({
      _sum: {
        cpu: true,
        gpu: true,
        memory: true,
      },
      where,
    })
  }

  createEnvironment(data: Prisma.EnvironmentUncheckedCreateInput): Promise<Environment> {
    return this.prisma.environment.create({ data })
  }

  updateEnvironment(environmentId: string, data: Pick<Prisma.EnvironmentUncheckedUpdateInput, 'cpu' | 'gpu' | 'memory' | 'autosync'>): Promise<Environment> {
    return this.prisma.environment.update({
      where: { id: environmentId },
      data,
    })
  }

  deleteEnvironment(environmentId: string): Promise<Environment> {
    return this.prisma.environment.delete({
      where: { id: environmentId },
    })
  }
}
