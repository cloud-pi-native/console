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
    if (!user || !user.sub) {
      return build()
    }

    const userId = user.sub

    // Un utilisateur peut lire les projets dont il est membre (via ProjectMembers)
    can('read', 'Project', {
      members: {
        some: {
          userId,
        },
      },
    })

    // Le propriétaire d'un projet peut tout gérer
    can('manage', 'Project', {
      ownerId: userId,
    })

    // Un utilisateur peut modifier un environnement si le projet n'est pas verrouillé
    // ET qu'il est membre du projet
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
