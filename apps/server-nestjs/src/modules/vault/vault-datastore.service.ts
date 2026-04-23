import type { Prisma } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../cpin-module/infrastructure/database/prisma.service'

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
      name: true,
      clusterId: true,
      cpu: true,
      gpu: true,
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
} satisfies Prisma.ZoneSelect

export type ZoneWithDetails = Prisma.ZoneGetPayload<{
  select: typeof zoneSelect
}>

@Injectable()
export class VaultDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
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

  async getAllZones(): Promise<ZoneWithDetails[]> {
    return this.prisma.zone.findMany({
      select: zoneSelect,
    })
  }
}
