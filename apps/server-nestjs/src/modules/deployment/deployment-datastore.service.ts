import type { Deployment, Prisma } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'

export type DeploymentWithRelations = Prisma.DeploymentGetPayload<{
  include: {
    environment: true
    deploymentSources: {
      include: {
        repository: true
        internalValueSources: true
        externalValueSource: true
      }
    }
  }
}>

const deploymentRelations = {
  environment: true,
  deploymentSources: {
    include: {
      repository: true,
      internalValueSources: { orderBy: { order: 'asc' } },
      externalValueSource: true,
    },
  },
} satisfies Prisma.DeploymentInclude

@Injectable()
export class DeploymentDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getDeploymentById(deploymentId: string): Promise<DeploymentWithRelations> {
    return this.prisma.deployment.findUniqueOrThrow({
      where: { id: deploymentId },
      include: deploymentRelations,
    })
  }

  getDeploymentsByProjectId(projectId: string): Promise<DeploymentWithRelations[]> {
    return this.prisma.deployment.findMany({
      where: { projectId },
      include: deploymentRelations,
      orderBy: { createdAt: 'asc' },
    })
  }

  createDeployment(data: Prisma.DeploymentCreateInput): Promise<Deployment> {
    return this.prisma.deployment.create({ data })
  }

  updateDeployment(deploymentId: string, data: Prisma.DeploymentUpdateInput): Promise<Deployment> {
    return this.prisma.deployment.update({
      where: { id: deploymentId },
      data,
    })
  }

  deleteDeployment(deploymentId: string): Promise<Deployment> {
    return this.prisma.deployment.delete({
      where: { id: deploymentId },
    })
  }

  deleteAllDeploymentsByProjectId(projectId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.deployment.deleteMany({
      where: { projectId },
    })
  }
}
