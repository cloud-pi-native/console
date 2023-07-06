import {
  addLogs,
  addClusterToEnvironment,
  removeClusterFromEnvironment,
} from '@/queries/index.js'
import { hooks } from '@/plugins/index.js'
import type { Cluster, Environment, Organization, Project, User } from '@prisma/client'

export const addClustersToEnvironmentBusiness = async (clusters: Cluster[], environmentName: Environment['name'], environmentId: Environment['id'], project: Project['name'], organization: Organization['name'], userId: User['id'], owner: User) => {
  for (const cluster of clusters) {
    await addClusterToEnvironment(cluster.id, environmentId)
    const addClusterExecResult = await hooks.addEnvironmentCluster.execute({
      environment: environmentName,
      organization,
      project,
      // @ts-ignore mix Clusters types
      cluster,
      owner,
    })
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Add Cluster to Environment', addClusterExecResult, userId)
    if (addClusterExecResult.failed) throw new Error('Echec des services à l\'ajout de Clusters pour l\'environnement')
  }
}

export const removeClustersFromEnvironmentBusiness = async (clusters: Cluster[], environmentName: Environment['name'], environmentId: Environment['id'], project: Project['name'], organization: Organization['name'], userId: User['id']) => {
  for (const cluster of clusters) {
    const addClusterExecResult = await hooks.removeEnvironmentCluster.execute({
      environment: environmentName,
      organization,
      project,
      // @ts-ignore mix Clusters types
      cluster,
    })
    await removeClusterFromEnvironment(environmentId, cluster.id)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Add Cluster to Environment', addClusterExecResult, userId)
    if (addClusterExecResult.failed) throw new Error('Echec des services à la suppression de Clusters pour l\'environnement')
  }
}
