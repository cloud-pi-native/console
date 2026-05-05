import type { Prisma } from '@cpn-console/database'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { SONARQUBE_PLUGIN_NAME } from './sonarqube.constants'

export const projectSelect = {
  id: true,
  slug: true,
  repositories: {
    select: {
      internalRepoName: true,
    },
  },
  plugins: {
    where: {
      pluginName: SONARQUBE_PLUGIN_NAME,
    },
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
export class SonarqubeDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
      where: {
        plugins: {
          some: {
            pluginName: SONARQUBE_PLUGIN_NAME,
          },
        },
      },
    })
  }

  async getProject(id: string): Promise<ProjectWithDetails | null> {
    return this.prisma.project.findUnique({
      where: { id },
      select: projectSelect,
    })
  }

  async getAdminPluginConfig(pluginName: string, key: string): Promise<string | null> {
    const result = await this.prisma.adminPlugin.findUnique({
      where: {
        pluginName_key: {
          pluginName,
          key,
        },
      },
      select: {
        value: true,
      },
    })
    return result?.value ?? null
  }
}
