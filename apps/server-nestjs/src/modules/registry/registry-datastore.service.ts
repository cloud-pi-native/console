import type { Prisma } from '@prisma/client'
import { ENABLED } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { AUTO_SYNC_PLUGIN_KEY, REGISTRY_PLUGIN_NAME, SUSPENDED_PLUGIN_KEY } from './registry.constants'

export const projectSelect = {
  slug: true,
  plugins: {
    select: {
      pluginName: true,
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
    return this.prisma.project.findMany({
      select: projectSelect,
    })
  }

  async getAutoSyncProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
      where: {
        AND: [
          {
            plugins: {
              some: {
                pluginName: REGISTRY_PLUGIN_NAME,
                key: AUTO_SYNC_PLUGIN_KEY,
                value: ENABLED,
              },
            },
          },
          {
            NOT: {
              plugins: {
                some: {
                  pluginName: REGISTRY_PLUGIN_NAME,
                  key: SUSPENDED_PLUGIN_KEY,
                  value: ENABLED,
                },
              },
            },
          },
        ],
      },
    })
  }

  async getProject(id: string): Promise<ProjectWithDetails | null> {
    return this.prisma.project.findUnique({ where: { id }, select: projectSelect })
  }

  async getAdminPluginConfig(pluginName: string, key: string): Promise<string | null> {
    const result = await this.prisma.adminPlugin.findUnique({
      where: { pluginName_key: { pluginName, key } },
      select: { value: true },
    })
    return result?.value ?? null
  }
}
