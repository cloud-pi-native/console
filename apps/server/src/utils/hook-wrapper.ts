import type { Cluster, Project } from '@prisma/client'
import type { ClusterObject, KubeCluster, KubeUser, Project as ProjectPayload, RepoCreds, Repository } from '@cpn-console/hooks'
import { hooks, Store } from '@cpn-console/hooks'
import { AsyncReturnType } from '@cpn-console/shared'
import { archiveProject, getClusterByIdOrThrow, getAdminPlugin, getHookProjectInfos, getHookPublicClusters, getHookRepository, getProjectStore, saveProjectStore, updateProjectCreated, updateProjectFailed } from '@/resources/queries-index.js'
import { genericProxy } from './proxy.js'
import { ConfigRecords, dbToObj } from '@/resources/project-service/business.js'

export type ReposCreds = Record<Repository['internalRepoName'], RepoCreds>
export type ProjectInfos = AsyncReturnType<typeof getHookProjectInfos>

const project = {
  upsert: async (projectId: Project['id'], reposCreds?: ReposCreds) => {
    const project = await getHookProjectInfos(projectId)

    const publicClusters = await getHookPublicClusters()
    const store = dbToObj(await getProjectStore(projectId))
    const config = dbToObj(await getAdminPlugin())
    const results = await hooks.upsertProject.execute(transformToHookProject({
      ...project,
      clusters: [...project.clusters, ...publicClusters],
    }, store, reposCreds), config)

    const records: ConfigRecords = Object.entries(results.results).reduce((acc, [pluginName, result]) => {
      if (result.store) {
        return [...acc, ...Object.entries(result.store).map(([key, value]) => ({ pluginName, key, value: String(value) }))]
      }
      return acc
    }, [] as ConfigRecords)

    await saveProjectStore(records, project.id)

    return {
      results,
      project: results.failed
        ? (await updateProjectFailed(projectId))
        : (await updateProjectCreated(projectId)),
    }
  },
  delete: async (projectId: Project['id']) => {
    const project = await getHookProjectInfos(projectId)
    const publicClusters = await getHookPublicClusters()
    const store = dbToObj(await getAdminPlugin())
    const config = dbToObj(await getProjectStore(projectId))
    const results = await hooks.deleteProject.execute(transformToHookProject({
      ...project,
      clusters: [...project.clusters, ...publicClusters],
    }, store), config)
    return {
      results,
      project: results.failed
        ? (await updateProjectFailed(projectId))
        : (await archiveProject(projectId)),
    }
  },
  getSecrets: async (projectId: Project['id']) => {
    const project = await getHookProjectInfos(projectId)
    const store = dbToObj(await getProjectStore(project.id))
    const config = dbToObj(await getAdminPlugin())

    return hooks.getProjectSecrets.execute({ ...project, store }, config)
  },
}

const cluster = {
  upsert: async (clusterId: Cluster['id']) => {
    const cluster = await getClusterByIdOrThrow(clusterId)
    const store = dbToObj(await getAdminPlugin())
    return hooks.upsertCluster.execute({
      ...cluster.kubeconfig as unknown as Pick<ClusterObject, 'cluster' | 'user'>,
      ...cluster,
    }, store)
  },
  delete: async (clusterId: Cluster['id']) => {
    const cluster = await getClusterByIdOrThrow(clusterId)
    const store = dbToObj(await getAdminPlugin())
    return hooks.deleteCluster.execute({
      ...cluster.kubeconfig as unknown as ClusterObject,
      ...cluster,
    }, store)
  },
}

const misc = {
  fetchOrganizations: async () => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.fetchOrganizations.execute({}, config)
  },
  retrieveUserByEmail: async (email: string) => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.retrieveUserByEmail.execute({ email }, config)
  },
  checkServices: async () => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.checkServices.execute({}, config)
  },
  syncRepository: async (repoId: string, { branchName }: {branchName: string}) => {
    const { project, ...repoInfos } = await getHookRepository(repoId)
    const store = dbToObj(await getProjectStore(project.id))
    const payload = {
      repo: { ...repoInfos, branchName },
      ...project,
      store,
    }
    const config = dbToObj(await getAdminPlugin())
    return hooks.syncRepository.execute(payload, config)
  },
}

export const hook = {
  misc: genericProxy(misc),
  project: genericProxy(project, { upsert: ['delete'], delete: ['upsert'], getSecrets: ['delete'] }),
  cluster: genericProxy(cluster, { delete: ['upsert'], upsert: ['delete'] }),
}

export const transformToHookProject = (project: ProjectInfos, store: Store, reposCreds: ReposCreds = {}): ProjectPayload => ({
  ...project,
  users: project.roles.map(role => role.user),
  roles: project.roles.map(role => ({ role: role.role as 'owner' | 'user', userId: role.userId })),
  clusters: project.clusters.map(({ kubeconfig, ...cluster }) => ({
    user: kubeconfig.user as unknown as KubeUser,
    cluster: kubeconfig.cluster as unknown as KubeCluster,
    ...cluster,
    privacy: cluster.privacy,
  })),
  environments: project.environments.map(({ permissions, quotaStage, ...environment }) => ({
    quota: quotaStage.quota,
    stage: quotaStage.stage.name,
    permissions: permissions.map(permission => ({
      userId: permission.userId,
      permissions: {
        ro: permission.level >= 0,
        rw: permission.level >= 1,
      },
    })),
    ...environment,
  })),
  repositories: project.repositories.map(repo => ({ ...repo, newCreds: reposCreds[repo.internalRepoName] })),
  store,
})
