import type { Prisma, Repository } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'

@Injectable()
export class RepositoryDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getRepositoriesByProjectId(projectId: string): Promise<Repository[]> {
    return this.prisma.repository.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    })
  }

  getRepositoryById(repositoryId: string): Promise<Repository> {
    return this.prisma.repository.findUniqueOrThrow({
      where: { id: repositoryId },
    })
  }

  async hasRepositoryWithName(projectId: string, internalRepoName: string): Promise<boolean> {
    const count = await this.prisma.repository.count({
      where: { projectId, internalRepoName },
    })
    return count > 0
  }

  createRepository(data: Prisma.RepositoryUncheckedCreateInput): Promise<Repository> {
    return this.prisma.repository.create({ data })
  }

  updateRepository(repositoryId: string, data: Prisma.RepositoryUncheckedUpdateInput): Promise<Repository> {
    return this.prisma.repository.update({
      where: { id: repositoryId },
      data,
    })
  }

  deleteRepository(repositoryId: string): Promise<Repository> {
    return this.prisma.repository.delete({
      where: { id: repositoryId },
    })
  }
}
