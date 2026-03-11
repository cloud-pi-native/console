import { Inject, Injectable } from '@nestjs/common'
import type { Prisma, ProjectSelect } from '@prisma/client'
import { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'

export const projectSelect = {
  id: true,
  slug: true,
  ownerId: true,
  everyonePerms: true,
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
      type: true,
    },
  },
  environments: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies ProjectSelect

export type ProjectWithDetails = Prisma.Result<
  PrismaService['project'],
  { select: typeof projectSelect },
  'findMany'
>[number]

@Injectable()
export class KeycloakDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
    })
  }
}
