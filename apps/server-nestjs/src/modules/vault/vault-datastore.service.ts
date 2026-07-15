import type { Prisma } from '@prisma/client'
import { ENABLED } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { AUTO_SYNC_PLUGIN_KEY, PLUGIN_NAME, SUSPENDED_PLUGIN_KEY } from './vault.constants'

export const projectSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  plugins: {
    select: {
      pluginName: true,
      key: true,
      value: true,
    },
  },
  environments: {
    select: {
      id: true,
      clusterId: true,
      cpu: true,
      memory: true,
      autosync: true,
    },
  },
} satisfies Prisma.ProjectSelect

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

export const zoneSelect = {
  id: true,
  slug: true,
  clusters: {
    select: {
      projects: {
        select: {
          id: true,
        },
      },
    },
  },
} satisfies Prisma.ZoneSelect

export type ZoneWithDetails = Prisma.ZoneGetPayload<{
  select: typeof zoneSelect
}>

@Injectable()
export class VaultDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAutoSyncProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
      where: {
        AND: [
          {
            plugins: {
              some: {
                pluginName: PLUGIN_NAME,
                key: AUTO_SYNC_PLUGIN_KEY,
                value: ENABLED,
              },
            },
          },
          {
            NOT: {
              plugins: {
                some: {
                  pluginName: PLUGIN_NAME,
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

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
    })
  }

  async getProject(id: string): Promise<ProjectWithDetails | null> {
    return this.prisma.project.findUnique({ where: { id }, select: projectSelect })
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

  async getAllZones(): Promise<ZoneWithDetails[]> {
    return this.prisma.zone.findMany({
      select: zoneSelect,
    })
  }

  async getAutoSyncZones(): Promise<ZoneWithDetails[]> {
    return this.prisma.zone.findMany({
      where: {
        clusters: {
          some: {
            environments: {
              some: {
                project: {
                  AND: [
                    {
                      plugins: {
                        some: {
                          pluginName: PLUGIN_NAME,
                          key: AUTO_SYNC_PLUGIN_KEY,
                          value: ENABLED,
                        },
                      },
                    },
                    {
                      NOT: {
                        plugins: {
                          some: {
                            pluginName: PLUGIN_NAME,
                            key: SUSPENDED_PLUGIN_KEY,
                            value: ENABLED,
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      select: zoneSelect,
    })
  }
}
