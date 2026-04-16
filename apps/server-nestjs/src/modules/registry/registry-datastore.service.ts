import type { Prisma } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../cpin-module/infrastructure/database/prisma.service'
import { REGISTRY_PLUGIN_NAME } from './registry.constants'

export const projectSelect = {
  slug: true,
  plugins: {
    select: {
      key: true,
      value: true,
    },
  },
} satisfies Prisma.ProjectSelect

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

@Injectable()
export class RegistryDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return await this.prisma.project.findMany({
      select: projectSelect,
      where: {
        plugins: {
          some: {
            pluginName: REGISTRY_PLUGIN_NAME,
          },
        },
      },
    })
  }

  async getProject(id: string): Promise<ProjectWithDetails | null> {
    return await this.prisma.project.findUnique({
      where: { id },
      select: projectSelect,
    })
  }
}
