import type { Prisma } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'

@Injectable()
export class DeploymentDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getDeploymentById(deploymentId: string) {
    return this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        environment: true,
        deploymentSources: {
          include: { repository: true },
        },
      },
    })
  }

  getDeploymentsByProjectId(projectId: string) {
    return this.prisma.deployment.findMany({
      where: { projectId },
      include: {
        environment: true,
        deploymentSources: {
          include: { repository: true },
        },
      },
    })
  }

  createDeployment(data: Prisma.DeploymentCreateInput) {
    return this.prisma.deployment.create({ data })
  }

  updateDeployment(deploymentId: string, data: Prisma.DeploymentUpdateInput) {
    return this.prisma.deployment.update({
      where: { id: deploymentId },
      data,
    })
  }

  deleteDeployment(deploymentId: string) {
    return this.prisma.deployment.delete({
      where: { id: deploymentId },
    })
  }

  deleteAllDeploymentsByProjectId(projectId: string) {
    return this.prisma.deployment.deleteMany({
      where: { projectId },
    })
  }
}
