import type { Cluster, Kubeconfig, Project, Zone } from '@prisma/client'
import type { ClusterObject, Config, HookResult, KubeCluster, KubeUser, Project as ProjectPayload, RepoCreds, Repository } from '@cpn-console/hooks'
import { hooks } from '@cpn-console/hooks'
import { AsyncReturnType } from '@cpn-console/shared'
import { archiveProject, getClusterByIdOrThrow, getAdminPlugin, getHookProjectInfos, getHookRepository, getProjectStore, saveProjectStore, updateProjectCreated, updateProjectFailed, getClustersAssociatedWithProject, updateProjectClusterHistory } from '@/resources/queries-index.js'
import { genericProxy } from './proxy.js'
import { ConfigRecords, dbToObj } from '@/resources/project-service/business.js'

export type ReposCreds = Record<Repository['internalRepoName'], RepoCreds>
export type ProjectInfos = AsyncReturnType<typeof getHookProjectInfos>

const getProjectPayload = async (projectId: Project['id'], reposCreds?: ReposCreds) => {
  const [
    project,
    store,
    clusters,
  ] = await Promise.all([
    getHookProjectInfos(projectId),
    getProjectStore(projectId),
    getClustersAssociatedWithProject(projectId),
  ])

  return transformToHookProject({
    ...project,
    clusters,
  }, dbToObj(store), reposCreds)
}

const project = {
  upsert: async (projectId: Project['id'], reposCreds?: ReposCreds) => {
    const [payload, config] = await Promise.all([
      getProjectPayload(projectId, reposCreds),
      getAdminPlugin(),
    ])

    const results = await hooks.upsertProject.execute(payload, dbToObj(config))

    const records: ConfigRecords = Object.entries(results.results).reduce((acc, [pluginName, result]) => {
      if (result.store) {
        return [...acc, ...Object.entries(result.store).map(([key, value]) => ({ pluginName, key, value: String(value) }))]
      }
      return acc
    }, [] as ConfigRecords)

    await saveProjectStore(records, projectId)

    return {
      results,
      project: manageProjectStatus(projectId, results, 'upsert', payload.environments.map(env => env.clusterId)),
    }
  },
  delete: async (projectId: Project['id']) => {
    const [payload, config] = await Promise.all([
      getProjectPayload(projectId),
      getAdminPlugin(),
    ])
    const results = await hooks.deleteProject.execute(payload, dbToObj(config))
    return {
      results,
      project: manageProjectStatus(projectId, results, 'delete', []),
    }
  },
  getSecrets: async (projectId: Project['id']) => {
    const project = await getHookProjectInfos(projectId)
    const store = dbToObj(await getProjectStore(project.id))
    const config = dbToObj(await getAdminPlugin())

    return hooks.getProjectSecrets.execute({ ...project, store }, config)
  },
}

type ProjectAction = keyof typeof project
const manageProjectStatus = async (
  projectId: Project['id'],
  hookReply: HookResult<ProjectPayload>,
  action: ProjectAction,
  envClusterIds: Cluster['id'][],
): Promise<AsyncReturnType<typeof updateProjectCreated>> => {
  if (!hookReply.failed && hookReply.results?.kubernetes) {
    await updateProjectClusterHistory(projectId, envClusterIds)
  }
  if (hookReply.failed) {
    return updateProjectFailed(projectId)
  } else if (action === 'upsert') {
    return updateProjectCreated(projectId)
  } else if (action === 'delete') {
    return archiveProject(projectId)
  }
  throw Error('unknown action')
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

const user = {
  retrieveUserByEmail: async (email: string) => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.retrieveUserByEmail.execute({ email }, config)
  },
  retrieveAdminUsers: async () => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.retrieveAdminUsers.execute({}, config)
  },
  updateUserAdminGroupMembership: async (id: string, { isAdmin }: { isAdmin: boolean }) => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.updateUserAdminGroupMembership.execute({ id, isAdmin }, config)
  },
}

const misc = {
  fetchOrganizations: async () => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.fetchOrganizations.execute({}, config)
  },
  checkServices: async () => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.checkServices.execute({}, config)
  },
  syncRepository: async (repoId: string, { branchName }: { branchName: string }) => {
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
  user: genericProxy(user, {}),
}

const formatClusterInfos = (
  { kubeconfig, ...cluster }: Omit<Cluster, 'updatedAt' | 'createdAt' | 'zoneId' | 'kubeConfigId'>
    & { kubeconfig: Kubeconfig, zone: Pick<Zone, 'id' | 'slug'> },
) => ({
  user: kubeconfig.user as unknown as KubeUser,
  cluster: kubeconfig.cluster as unknown as KubeCluster,
  ...cluster,
  privacy: cluster.privacy,
})

export const transformToHookProject = (project: ProjectInfos, store: Config, reposCreds: ReposCreds = {}): ProjectPayload => {
  const clusters = project.clusters.map(cluster => formatClusterInfos(cluster))

  return ({
    ...project,
    users: project.roles.map(role => role.user),
    roles: project.roles.map(role => ({ role: role.role as 'owner' | 'user', userId: role.userId })),
    clusters,
    environments: project.environments.map(({ permissions, quota, stage, ...environment }) => ({
      quota,
      stage: stage.name,
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
}
