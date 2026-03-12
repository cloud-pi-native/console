import type { PureAbility } from '@casl/ability'
import { AbilityBuilder } from '@casl/ability'
import type { PrismaQuery, Subjects } from '@casl/prisma'
import { createPrismaAbility } from '@casl/prisma'
import { Injectable } from '@nestjs/common'
import type { Project, Environment, User, ProjectMembers } from '@prisma/client'

export type AppAbility = PureAbility<
  [string, Subjects<{ Project: Project, Environment: Environment, User: User, ProjectMembers: ProjectMembers }>],
  PrismaQuery
>

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: any) {
    const { can, build } = new AbilityBuilder<AppAbility>(
      createPrismaAbility,
    )

    // If user is not authenticated or doesn't have an ID
    if (!user?.sub) {
      return build()
    }

    const userId = user.sub

    // A user can read projects they are a member of (via ProjectMembers)
    can('read', 'Project', {
      members: {
        some: {
          userId,
        },
      },
    })

    // A project owner can manage everything
    can('manage', 'Project', {
      ownerId: userId,
    })

    // A user can update an environment if the project is not locked
    // and they are a member of the project
    can('update', 'Environment', {
      project: {
        is: {
          locked: false,
          members: {
            some: {
              userId,
            },
          },
        },
      },
    })

    return build()
  }
}
