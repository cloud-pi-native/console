import type { Cluster, Project } from '@prisma/client'
import type { ClusterObject, KubeCluster, KubeUser, PluginResult, Project as ProjectPayload, RepoCreds, Repository } from '@cpn-console/hooks'
import { hooks } from '@cpn-console/hooks'
import { AsyncReturnType } from '@cpn-console/shared'
import { archiveProject, getClusterByIdOrThrow, getHookProjectInfos, getHookPublicClusters, updateProjectCreated, updateProjectFailed, updateProjectServices } from '@/resources/queries-index.js'
import { genericProxy } from './proxy.js'

type ReposCreds = Record<Repository['internalRepoName'], RepoCreds>
type ProjectInfos = AsyncReturnType<typeof getHookProjectInfos>

const project = {
  upsert: async (projectId: Project['id'], reposCreds?: ReposCreds) => {
    const project = await getHookProjectInfos(projectId)
    const publicClusters = await getHookPublicClusters()
    const results = await hooks.upsertProject.execute(transformToHookProject({
      ...project,
      clusters: [...project.clusters, ...publicClusters],
    }, reposCreds))

    // @ts-ignore
    const { registry }: { registry: PluginResult } = results.results
    if (registry) {
      const services = {
        registry: {
          id: registry?.result?.project?.project_id,
        },
      }
      await updateProjectServices(project.id, services)
    }

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

    const results = await hooks.deleteProject.execute(transformToHookProject({
      ...project,
      clusters: [...project.clusters, ...publicClusters],
    }))
    return {
      results,
      project: results.failed
        ? (await updateProjectFailed(projectId))
        : (await archiveProject(projectId)),
    }
  },
  getSecrets: async (projectId: Project['id']) => {
    const project = await getHookProjectInfos(projectId)
    return hooks.getProjectSecrets.execute(project)
  },
}

const cluster = {
  upsert: async (clusterId: Cluster['id']) => {
    const cluster = await getClusterByIdOrThrow(clusterId)
    return hooks.upsertCluster.execute({
      ...cluster.kubeconfig as unknown as ClusterObject,
      ...cluster,
    })
  },
  delete: async (clusterId: Cluster['id']) => {
    const cluster = await getClusterByIdOrThrow(clusterId)
    return hooks.deleteCluster.execute({
      ...cluster.kubeconfig as unknown as ClusterObject,
      ...cluster,
    })
  },
}

const misc = {
  fetchOrganizations: () => hooks.fetchOrganizations.execute({}),
  retrieveUserByEmail: (email: string) => hooks.retrieveUserByEmail.execute({ email }),
  checkServices: () => hooks.checkServices.execute({}),
}

export const hook = {
  misc: genericProxy(misc),
  project: genericProxy(project, { upsert: ['delete'], delete: ['upsert'], getSecrets: ['delete'] }),
  cluster: genericProxy(cluster, { delete: ['upsert'], upsert: ['delete'] }),
}

const transformToHookProject = (project: ProjectInfos, reposCreds: ReposCreds = {}): ProjectPayload => ({
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
})
