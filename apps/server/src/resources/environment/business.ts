import {
  addLogs,
  addClusterToEnvironment,
  removeClusterFromEnvironment,
  getEnvironmentInfos as getEnvironmentInfosQuery,
  getClustersByIds,
  getPublicClusters,
  updateEnvironmentCreated,
  updateEnvironmentFailed,
  lockProject,
  getProjectInfos,
  initializeEnvironment,
  updateEnvironmentDeleting,
  deleteEnvironment as deleteEnvironmentQuery,
  getUserById,
  getQuotas as getQuotasQuery,
  updateEnvironment as updateEnvironmentQuery,
  getStages as getStagesQuery,
  getStageById,
} from '@/resources/queries-index.js'
import { hooks } from '@/plugins/index.js'
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError, UnprocessableContentError } from '@/utils/errors.js'
import type { Cluster, Stage, Environment, Kubeconfig, Organization, Project, Role, User } from '@prisma/client'
import {
  type AsyncReturnType,
  checkInsufficientRoleInProject,
  checkClusterUnavailable,
  filterOwners,
  checkInsufficientPermissionInEnvironment,
  checkRoleAndLocked,
} from '@/utils/controller.js'
import { unlockProjectIfNotFailed } from '@/utils/business.js'
import { projectRootDir } from '@/utils/env.js'
import { getProjectInfosAndClusters } from '@/resources/project/business.js'
import { gitlabUrl } from '@/plugins/core/gitlab/utils.js'

// Fetch infos
export const getEnvironmentInfosAndClusters = async (environmentId: string) => {
  const env = await getEnvironmentInfosQuery(environmentId)
  if (!env) throw new NotFoundError('Environnement introuvable', undefined)
  const authorizedClusters = [...await getPublicClusters(), ...env.project.clusters]
  return { env, authorizedClusters }
}

export const getEnvironmentInfos = async (environmentId: string) => {
  const env = await getEnvironmentInfosQuery(environmentId)
  if (!env) throw new NotFoundError('Environnement introuvable', undefined)
  return env
}

export const getInitializeEnvironmentInfos = async (userId: User['id'], projectId: Project['id']) => {
  const owner = await getUserById(userId)
  const { project, authorizedClusters } = await getProjectInfosAndClusters(projectId)
  return { owner, project, authorizedClusters }
}

export const getQuotas = async (userId: User['id']) => {
  const user = await getUserById(userId)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')
  return getQuotasQuery()
}

export const getStages = async (userId: User['id']) => {
  const user = await getUserById(userId)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')
  return getStagesQuery()
}

// Check logic
type CheckEnvironmentParam = {
  project: { locked: boolean, roles: Role[], id: string, environments: Environment[] },
  authorizedClusters: Cluster[],
  userId: string,
  newClustersId: string[],
  stageId: Environment['stageId'],
}

export const checkGetEnvironment = (
  env: AsyncReturnType<typeof getEnvironmentInfos>,
  userId: string,
) => {
  const errorMessage = checkInsufficientRoleInProject(userId, { roles: env.project.roles }) ||
    checkInsufficientPermissionInEnvironment(userId, env.permissions, 0)
  if (errorMessage) throw new ForbiddenError(errorMessage, { description: '', extras: { userId, projectId: env.project.id } })
}

export const checkCreateEnvironment = ({
  project,
  authorizedClusters,
  userId,
  newClustersId,
  stageId,
}: CheckEnvironmentParam) => {
  const errorMessage = checkRoleAndLocked(project, userId, 'owner') ||
    checkClusterUnavailable(newClustersId, authorizedClusters) ||
    checkExistingEnvironment(project.environments, stageId)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
}

export const checkUpdateEnvironment = (
  project: { locked: boolean, roles: Role[], id: string },
  authorizedClusters: Pick<Cluster, 'id'>[],
  userId: string,
  newClustersId: string[],
) => {
  const errorAuthorizationMessage = checkRoleAndLocked(project, userId, 'owner')

  if (errorAuthorizationMessage) throw new BadRequestError(errorAuthorizationMessage, { description: '', extras: { userId, projectId: project.id } })

  const errorContentMessage = checkClusterUnavailable(newClustersId, authorizedClusters)
  if (errorContentMessage) throw new BadRequestError(errorContentMessage, { description: '', extras: { userId, projectId: project.id } })
}

export const checkDeleteEnvironment = (
  project: { locked: boolean, roles: Role[], id: string },
  userId: string,
) => {
  const errorMessage = checkInsufficientRoleInProject(userId, { minRole: 'owner', roles: project.roles })
  if (errorMessage) throw new ForbiddenError(errorMessage, { description: '', extras: { userId, projectId: project.id } })
}

export const checkExistingEnvironment = (environments: Environment[], stageId: Environment['stageId']) => {
  if (environments?.find(env => env.stageId === stageId)) {
    return 'L\'environnement choisi existe déjà pour ce projet'
  }
}

// Routes logic
export const createEnvironment = async (
  project: AsyncReturnType<typeof getProjectInfos>,
  owner: User,
  userId: string,
  stageId: Environment['stageId'],
  newClustersId: string[],
  quotaId: Environment['quotaId'],
) => {
  await lockProject(project.id)
  const projectOwners = filterOwners(project.roles)
  const env = await initializeEnvironment({ projectId: project.id, quotaId, stageId, projectOwners })
  const environmentName = (await getStageById(stageId)).name

  try {
    const projectName = project.name
    const organizationName = project.organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organizationName}/${projectName}`
    const repositories = env.project.repositories?.map(({ internalRepoName }) => ({
      url: `${gitlabBaseURL}/${internalRepoName}.git`,
      internalRepoName,
    }))

    const envData = {
      environment: environmentName,
      project: projectName,
      organization: organizationName,
      repositories,
      owner,
    }
    const results = await hooks.initializeEnvironment.execute(envData)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Create Environment', results, userId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec services à la création de l\'environnement')
    }

    const clusters = await getClustersByIds(newClustersId)
    await addClustersToEnvironment(clusters, environmentName, env.id, project.name, project.organization.name, userId, owner)

    await updateEnvironmentCreated(env.id)
    await unlockProjectIfNotFailed(project.id)
    return env
  } catch (error) {
    await updateEnvironmentFailed(env.id)
    throw new Error(error?.message)
  }
}

export const updateEnvironment = async (
  env: AsyncReturnType<typeof getEnvironmentInfos>,
  userId: string,
  newClustersId: string[],
  quotaId?: string,
) => {
  try {
    await lockProject(env.project.id)

    // Premièrement, ajout des clusters sur les environnements
    const environmentName = (await getStageById(env.stageId)).name
    const owner = env.project.roles[0].user
    const reallyNewClusters = await getClustersByIds(newClustersId.filter(newClusterId => !env.clusters.some(envCluster => envCluster.id === newClusterId)))
    await addClustersToEnvironment(reallyNewClusters, environmentName, env.id, env.project.name, env.project.organization.name, userId, owner)

    // Puis retrait des clusters pour les environnements
    const clustersToRemove = await getClustersByIds(
      env.clusters
        .filter(oldCluster => !newClustersId.includes(oldCluster.id))
        .map(({ id }) => id),
    )
    await removeClustersFromEnvironment(clustersToRemove, environmentName, env.id, env.project.name, env.project.organization.name, userId)

    // Modification du quota
    if (quotaId) {
      await updateEnvironmentQuery({ id: env.id, quotaId })
    }

    // mise à jour des status
    await updateEnvironmentCreated(env.id)
    await unlockProjectIfNotFailed(env.project.id)
  } catch (error) {
    await updateEnvironmentFailed(env.id)
    throw new Error(error?.message)
  }
}

export const deleteEnvironment = async (
  env: AsyncReturnType<typeof getEnvironmentInfos>,
  userId: string,
) => {
  try {
    await updateEnvironmentDeleting(env.id)
    await lockProject(env.project.id)

    // Retrait des clusters pour les environnements
    const clustersToRemove = await getClustersByIds(
      env.clusters
        .map(({ id }) => id),
    )
    const environmentName = (await getStageById(env.stageId)).name
    await removeClustersFromEnvironment(clustersToRemove, environmentName, env.id, env.project.name, env.project.organization.name, userId)

    const projectName = env.project.name
    const organizationName = env.project.organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organizationName}/${projectName}`
    const repositories = env.project.repositories.map(({ internalRepoName }) => ({
      url: `${gitlabBaseURL}/${internalRepoName}.git`,
      internalRepoName,
    }))

    const envData = {
      environment: environmentName,
      project: projectName,
      organization: organizationName,
      repositories,
    }
    const results = await hooks.deleteEnvironment.execute(envData)
    await addLogs('Delete Environment', results, userId)
    if (results.failed) {
      throw new Error('Echec des services à la suppression de l\'environnement')
    }

    // mise à jour des status
    await deleteEnvironmentQuery(env.id)
    await unlockProjectIfNotFailed(env.project.id)
  } catch (error) {
    await updateEnvironmentFailed(env.id)
    throw new Error(error?.message)
  }
}

// Cluster Logic
export const addClustersToEnvironment = async (
  clusters: (Cluster & { kubeconfig: Kubeconfig })[],
  environmentName: Stage['name'],
  environmentId: Environment['id'],
  project: Project['name'],
  organization: Organization['name'],
  userId: User['id'],
  owner: User,
): Promise<void> => {
  for (const cluster of clusters) {
    await addClusterToEnvironment(cluster.id, environmentId)
    const addClusterExecResult = await hooks.addEnvironmentCluster.execute({
      environment: environmentName,
      organization,
      project,
      // @ts-ignore mix Clusters types
      cluster: {
        ...cluster,
        ...cluster.kubeconfig,
      },
      owner,
    })
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Add Cluster to Environment', addClusterExecResult, userId)
    if (addClusterExecResult.failed) throw new UnprocessableContentError('Echec des services à l\'ajout de Clusters pour l\'environnement')
  }
}

export const removeClustersFromEnvironment = async (
  clusters: (Cluster & { kubeconfig: Kubeconfig })[],
  environmentName: Stage['name'],
  environmentId: Environment['id'],
  project: Project['name'],
  organization: Organization['name'],
  userId: User['id'],
) => {
  for (const cluster of clusters) {
    const addClusterExecResult = await hooks.removeEnvironmentCluster.execute({
      environment: environmentName,
      organization,
      project,
      // @ts-ignore mix Clusters types
      cluster: {
        ...cluster,
        ...cluster.kubeconfig,
      },
    })
    await removeClusterFromEnvironment(cluster.id, environmentId)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Remove Cluster from Environment', addClusterExecResult, userId)
    if (addClusterExecResult.failed) throw new UnprocessableContentError('Echec des services à la suppression de Clusters pour l\'environnement')
  }
}
