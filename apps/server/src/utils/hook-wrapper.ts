import type { Cluster, Kubeconfig, Project, ProjectRole, Zone } from '@prisma/client'
import type { ClusterObject, HookResult, KubeCluster, KubeUser, Project as ProjectPayload, RepoCreds, Repository, Store, ZoneObject } from '@cpn-console/hooks'
import { hooks } from '@cpn-console/hooks'
import type { AsyncReturnType } from '@cpn-console/shared'
import { ProjectAuthorized, getPermsByUserRoles, resourceListToDict } from '@cpn-console/shared'
import { genericProxy } from './proxy.js'
import { archiveProject, getAdminPlugin, getAdminRoleById, getClusterByIdOrThrow, getClusterNamesByZoneId, getClustersAssociatedWithProject, getHookProjectInfos, getHookRepository, getProjectStore, getZoneByIdOrThrow, saveProjectStore, updateProjectClusterHistory, updateProjectCreated, updateProjectFailed, updateProjectWarning } from '@/resources/queries-index.js'
import type { ConfigRecords } from '@/resources/project-service/business.js'
import { dbToObj } from '@/resources/project-service/business.js'

export type ReposCreds = Record<Repository['internalRepoName'], RepoCreds>
export type ProjectInfos = AsyncReturnType<typeof getHookProjectInfos>

async function getProjectPayload(projectId: Project['id'], reposCreds?: ReposCreds) {
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

async function upsertProject(projectId: Project['id'], reposCreds?: ReposCreds) {
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
  const project = await manageProjectStatus(projectId, results, 'upsert', payload.environments.map(env => env.clusterId))
  return {
    results,
    project,
  }
}
const project = {
  upsert: async (projectId: Project['id'], reposCreds?: ReposCreds) => {
    const results = await upsertProject(projectId, reposCreds)
    // automatically retry one time if it fails
    return results.results.failed ? upsertProject(projectId, reposCreds) : results
  },
  delete: async (projectId: Project['id']) => {
    const [payload, config] = await Promise.all([
      getProjectPayload(projectId),
      getAdminPlugin(),
    ])
    const results = await hooks.deleteProject.execute(payload, dbToObj(config))
    return {
      results,
      project: await manageProjectStatus(projectId, results, 'delete', []),
    }
  },
  getSecrets: async (projectId: Project['id']) => {
    const project = await getHookProjectInfos(projectId)
    const store = dbToObj(await getProjectStore(project.id))
    const config = dbToObj(await getAdminPlugin())

    return hooks.getProjectSecrets.execute({ ...project, store }, config)
  },
} as const

type ProjectAction = keyof typeof project
async function manageProjectStatus(projectId: Project['id'], hookReply: HookResult<ProjectPayload>, action: ProjectAction, envClusterIds: Cluster['id'][]): Promise<AsyncReturnType<typeof updateProjectCreated>> {
  if (!hookReply.failed && hookReply.results?.kubernetes) {
    await updateProjectClusterHistory(projectId, envClusterIds)
  }
  if (hookReply.failed) {
    return updateProjectFailed(projectId)
  } else if (hookReply.warning.length) {
    return updateProjectWarning(projectId)
  } else if (action === 'upsert') {
    return updateProjectCreated(projectId)
  } else if (action === 'delete') {
    return archiveProject(projectId)
  }
  throw new Error('unknown action')
}

const cluster = {
  upsert: async (clusterId: Cluster['id'], previousZoneId: Cluster['zoneId']) => {
    const cluster = await getClusterByIdOrThrow(clusterId)
    const clusterObject = cluster as unknown as ClusterObject
    const store = dbToObj(await getAdminPlugin())
    if (cluster.zoneId !== previousZoneId) {
      // Upsert on the old zone to remove cluster
      const previousClusterObject = {
        ...cluster,
      } as unknown as ClusterObject
      previousClusterObject.zone = await getZoneByIdOrThrow(previousZoneId)
      previousClusterObject.zone.clusterNames = await getClusterNamesByZoneId(previousZoneId)
      const hookResult = await hooks.upsertCluster.execute({
        ...cluster.kubeconfig as unknown as Pick<ClusterObject, 'cluster' | 'user'>,
        ...previousClusterObject,
      }, store)
      if (hookResult.failed) {
        return hookResult
      }
    }
    clusterObject.zone.clusterNames = await getClusterNamesByZoneId(cluster.zoneId)
    return hooks.upsertCluster.execute({
      ...cluster.kubeconfig as unknown as Pick<ClusterObject, 'cluster' | 'user'>,
      ...clusterObject,
    }, store)
  },
  delete: async (clusterId: Cluster['id']) => {
    const cluster = await getClusterByIdOrThrow(clusterId)
    const clusterObject = cluster as unknown as ClusterObject
    const clusterNames = await getClusterNamesByZoneId(cluster.zoneId)
    clusterObject.zone.clusterNames = clusterNames.filter(c => c !== cluster.label)
    const store = dbToObj(await getAdminPlugin())
    return hooks.deleteCluster.execute({
      ...cluster.kubeconfig as unknown as ClusterObject,
      ...clusterObject,
    }, store)
  },
} as const

const user = {
  retrieveUserByEmail: async (email: string) => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.retrieveUserByEmail.execute({ email }, config)
  },
} as const

const zone = {
  upsert: async (zoneId: Zone['id']) => {
    const zone: ZoneObject = await getZoneByIdOrThrow(zoneId)
    zone.clusterNames = await getClusterNamesByZoneId(zoneId)
    const store = dbToObj(await getAdminPlugin())
    return hooks.upsertZone.execute(zone, store)
  },
  delete: async (zoneId: Zone['id']) => {
    const zone = await getZoneByIdOrThrow(zoneId)
    const store = dbToObj(await getAdminPlugin())
    return hooks.deleteZone.execute(zone, store)
  },
} as const

const misc = {
  checkServices: async () => {
    const config = dbToObj(await getAdminPlugin())
    return hooks.checkServices.execute({}, config)
  },
  syncRepository: async (repoId: string, { syncAllBranches, branchName }: { syncAllBranches: boolean, branchName?: string }) => {
    const { project, ...repoInfos } = await getHookRepository(repoId)
    const store = dbToObj(await getProjectStore(project.id))
    const payload = {
      repo: { ...repoInfos, syncAllBranches, branchName },
      ...project,
      store,
    }
    const config = dbToObj(await getAdminPlugin())
    return hooks.syncRepository.execute(payload, config)
  },
} as const

const adminRole = {
  upsert: async (roleId: string) => {
    const role = await getAdminRoleById(roleId)
    if (!role) throw new Error('Role not found')
    const config = dbToObj(await getAdminPlugin())
    return hooks.upsertAdminRole.execute(role, config)
  },
  delete: async (role: AsyncReturnType<typeof getAdminRoleById>) => {
    if (!role) throw new Error('Role is required')
    const config = dbToObj(await getAdminPlugin())
    return hooks.deleteAdminRole.execute(role, config)
  },
} as const

export const hook = {
  // @ts-ignore TODO voir comment opti la signature de la fonction
  misc: genericProxy(misc),
  // @ts-ignore TODO voir comment opti la signature de la fonction
  project: genericProxy(project, { upsert: ['delete'], delete: ['upsert', 'delete'], getSecrets: ['delete'] }),
  // @ts-ignore TODO voir comment opti la signature de la fonction
  cluster: genericProxy(cluster, { delete: ['upsert', 'delete'], upsert: ['delete'] }),
  // @ts-ignore TODO voir comment opti la signature de la fonction
  zone: genericProxy(zone, { delete: ['upsert'], upsert: ['delete'] }),
  // @ts-ignore TODO voir comment opti la signature de la fonction
  user: genericProxy(user, {}),
  // @ts-ignore TODO voir comment opti la signature de la fonction
  adminRole: genericProxy(adminRole, { delete: ['upsert'], upsert: ['delete'] }),
}

function formatClusterInfos({ kubeconfig, ...cluster }: Omit<Cluster, 'updatedAt' | 'createdAt' | 'zoneId' | 'kubeConfigId'>
  & { kubeconfig: Kubeconfig, zone: Pick<Zone, 'id' | 'slug' | 'label' | 'argocdUrl'> }) {
  return {
    user: kubeconfig.user as unknown as KubeUser,
    cluster: kubeconfig.cluster as unknown as KubeCluster,
    ...cluster,
    privacy: cluster.privacy,
  }
}
export type RolesById = Record<ProjectRole['id'], ProjectRole['permissions']>

export function transformToHookProject(project: ProjectInfos, store: Store, reposCreds: ReposCreds = {}): ProjectPayload {
  const clusters = project.clusters.map(cluster => formatClusterInfos(cluster))
  const rolesById = resourceListToDict(project.roles)

  return ({
    ...project,
    clusters,
    environments: project.environments.map(({ stage, ...environment }) => ({
      stage: stage.name,
      permissions: [
        { permissions: { rw: true, ro: true }, userId: project.ownerId },
        ...project.members.map(member => ({
          userId: member.userId,
          permissions: {
            ro: ProjectAuthorized.ListEnvironments({ adminPermissions: 0n, projectPermissions: getPermsByUserRoles(member.roleIds, rolesById, project.everyonePerms) }),
            rw: ProjectAuthorized.ManageEnvironments({ adminPermissions: 0n, projectPermissions: getPermsByUserRoles(member.roleIds, rolesById, project.everyonePerms) }),
          },
        })),
      ],
      ...environment,
      apis: {},
    })),
    repositories: project.repositories.map(repo => ({ ...repo, newCreds: reposCreds[repo.internalRepoName] })),
    store,
    users: [project.owner, ...project.members.map(({ user }) => user)],
    roles: [
      {
        name: 'owner',
        position: 0,
        users: [project.owner],
      },
      ...project.roles.map(role => ({
        name: role.name,
        permissions: role.permissions.toString(),
        position: role.position,
        type: role.type,
        oidcGroup: role.oidcGroup,
        users: project.members
          .filter(member => member.roleIds.includes(role.id))
          .map(member => member.user),
      })),
    ],
  })
}
