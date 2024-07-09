import { UserProfile, adminGroupPath } from '@cpn-console/shared'
import {
  listClustersForUser,
} from '../queries-index.js'
import { type Prisma } from '@prisma/client'

export const getAllUserClusters = async (kcUser: UserProfile) => {
  const isAdmin = kcUser.groups?.includes(adminGroupPath)
  const where: Prisma.ClusterWhereInput = isAdmin
    ? {}
    : {
        OR: [
          // Sélectionne tous les clusters publiques
          { privacy: 'public' },
          // Sélectionne les clusters associés aux projets dont l'user est membre
          {
            projects: { some: { roles: { some: { userId: kcUser.id } } } },
          },
          // Sélectionne les clusters associés aux environnments appartenant à des projets dont l'user est membre
          {
            environments: { some: { project: { roles: { some: { userId: kcUser.id } } } } },
          },
        ],
      }
  const clusters = await listClustersForUser(where)
  return clusters.map(({ stages, ...cluster }) => ({
    ...cluster,
    stageIds: stages.map(({ id }) => id) ?? [],
  }))
}
