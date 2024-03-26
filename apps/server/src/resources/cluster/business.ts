import { UnauthorizedError } from '@/utils/errors.js'
import { UserProfile, adminGroupPath, exclude } from '@cpn-console/shared'
import {
  getClustersWithProjectIdAndConfig,
  getUserById,
} from '../queries-index.js'

export const getAllCleanedClusters = async (kcUser: UserProfile) => {
  const user = await getUserById(kcUser.id)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')

  const clusters = await getClustersWithProjectIdAndConfig()

  if (kcUser.groups?.includes(adminGroupPath)) {
    const cleanedClusters = clusters.map(cluster => {
      const newCluster = exclude({
        ...cluster,
        user: cluster.kubeconfig.user,
        cluster: cluster.kubeconfig.cluster,
        projectIds: cluster.projects.filter(project => project.status !== 'archived').map(({ id }) => id),
        stageIds: cluster.stages.map(({ id }) => id) ?? [],
      },
      ['projects', 'stages', 'kubeconfig'])
      return newCluster
    })
    return cleanedClusters
  }

  const cleanedClusters = clusters.map(cluster => {
    const newCluster = exclude({
      id: cluster.id,
      label: cluster.label,
      projectIds: cluster.projects.filter(project => project.status !== 'archived').map(({ id }) => id),
      stageIds: cluster.stages.map(({ id }) => id) ?? [],
    },
    ['projects', 'stages', 'kubeconfig'])
    return newCluster
  })
  return cleanedClusters
}
