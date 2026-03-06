import { Inject, Injectable, Logger } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'

export const projectSelect = {
  id: true,
  slug: true,
  ownerId: true,
  everyonePerms: true,
  plugins: {
    select: {
      pluginName: true,
      key: true,
      value: true,
    },
  },
  members: {
    select: {
      roleIds: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  },
  roles: {
    select: {
      id: true,
      permissions: true,
      oidcGroup: true,
    },
  },
  environments: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ProjectSelect

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

@Injectable()
export class KeycloakDatastoreService {
  private readonly logger = new Logger(KeycloakDatastoreService.name)

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
    })
  }
}
