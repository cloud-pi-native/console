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
} from '@/resources/queries-index.js'
import { hooks } from '@/plugins/index.js'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/utils/errors.js'
import type { Cluster, Environment, Kubeconfig, Organization, Project, Role, User } from '@prisma/client'
import {
  type AsyncReturnType,
  checkInsufficientRoleInProject,
  checkClusterUnavailable,
  filterOwners,
  checkInsufficientPermissionInEnvironment,
} from '@/utils/controller.js'
import { unlockProjectIfNotFailed } from '@/utils/business.js'
import { projectIsLockedInfo, ProjectRoles } from 'shared'
import { gitlabUrl, harborUrl, projectRootDir } from '@/utils/env.js'
import { getProjectInfosAndClusters } from '@/resources/project/business.js'

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

// Check logic
type CheckEnvironmentParam = {
  project: { locked: boolean, roles: Role[], id: string, environments: Environment[] },
  authorizedClusters: Cluster[],
  userId: string,
  newClustersId: string[],
  envName: string,
}

export const checkGetEnvironment = async (
  env: AsyncReturnType<typeof getEnvironmentInfos>,
  userId: string,
) => {
  const errorMessage = checkAuthorization(env.project, userId, 'user') ||
    checkInsufficientPermissionInEnvironment(userId, env.permissions, 0)
  if (errorMessage) throw new ForbiddenError(errorMessage, { description: '', extras: { userId, projectId: env.project.id } })
}

export const checkCreateEnvironment = ({
  project,
  authorizedClusters,
  userId,
  newClustersId,
  envName,
}: CheckEnvironmentParam) => {
  const errorMessage = checkAuthorization(project, userId, 'owner') ||
    checkClusterUnavailable(newClustersId, authorizedClusters) ||
    checkExistingEnvironment(project.environments, envName)
  if (errorMessage) throw new Error(errorMessage)
}

export const checkUpdateEnvironment = (
  project: { locked: boolean, roles: Role[], id: string },
  authorizedClusters: Pick<Cluster, 'id'>[],
  userId: string,
  newClustersId: string[],
) => {
  const errorAuthorizationMessage = checkAuthorization(project, userId, 'owner')

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

export const checkAuthorization = (
  project: { locked: boolean, roles: Role[] },
  userId: string,
  minRole: ProjectRoles = 'user',
) => {
  return project.locked
    ? projectIsLockedInfo
    : checkInsufficientRoleInProject(userId, { minRole, roles: project.roles })
}

export const checkExistingEnvironment = (environments: Environment[], envName: string) => {
  if (environments?.find(env => env.name === envName)) {
    return `L'environnement ${envName} existe déjà pour ce projet`
  }
}

// Routes logic
export const createEnvironment = async (
  project: AsyncReturnType<typeof getProjectInfos>,
  owner: User,
  userId: string,
  envName: string,
  newClustersId: string[],
) => {
  let env
  try {
    await lockProject(project.id)
    const projectOwners = filterOwners(project.roles)
    env = await initializeEnvironment({ projectId: project.id, name: envName, projectOwners })

    const registryHost = harborUrl.split('//')[1].split('/')[0]
    const environmentName = env.name
    const projectName = project.name
    const organizationName = project.organization.name
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
      registryHost,
      owner,
    }
    const results = await hooks.initializeEnvironment.execute(envData)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Create Environment', results, userId)
    if (results.failed) {
      throw new Error('Echec services à la création de l\'environnement')
    }

    const clusters = await getClustersByIds(newClustersId)
    await addClustersToEnvironmentBusiness(clusters, env.name, env.id, project.name, project.organization.name, userId, owner)

    await updateEnvironmentCreated(env.id)
    await unlockProjectIfNotFailed(project.id)
    return env
  } catch (error) {
    await updateEnvironmentFailed(env.id)
    return error
  }
}

export const updateEnvironment = async (
  env: AsyncReturnType<typeof getEnvironmentInfos>,
  userId: string,
  newClustersId: string[],
) => {
  try {
    await lockProject(env.project.id)

    // Premièrement, ajout des clusters sur les environnements
    const owner = env.project.roles[0].user
    const reallyNewClusters = await getClustersByIds(newClustersId.filter(newClusterId => !env.clusters.some(envCluster => envCluster.id === newClusterId)))
    await addClustersToEnvironmentBusiness(reallyNewClusters, env.name, env.id, env.project.name, env.project.organization.name, userId, owner)

    // Puis retrait des clusters pour les environnements
    const clustersToRemove = await getClustersByIds(
      env.clusters
        .filter(oldCluster => !newClustersId.includes(oldCluster.id))
        .map(({ id }) => id),
    )
    await removeClustersFromEnvironmentBusiness(clustersToRemove, env.name, env.id, env.project.name, env.project.organization.name, userId)

    // mise à jour des status
    await updateEnvironmentCreated(env.id)
    await unlockProjectIfNotFailed(env.project.id)
  } catch (error) {
    await updateEnvironmentFailed(env.id)
    return error
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
    await removeClustersFromEnvironmentBusiness(clustersToRemove, env.name, env.id, env.project.name, env.project.organization.name, userId)

    const projectName = env.project.name
    const organizationName = env.project.organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organizationName}/${projectName}`
    const repositories = env.project.repositories.map(({ internalRepoName }) => ({
      url: `${gitlabBaseURL}/${internalRepoName}.git`,
      internalRepoName,
    }))

    const envData = {
      environment: env.name,
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
    return error
  }
}

// Cluster Logic
export const addClustersToEnvironmentBusiness = async (
  clusters: (Cluster & { kubeconfig: Kubeconfig })[],
  environmentName: Environment['name'],
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
    if (addClusterExecResult.failed) throw new Error('Echec des services à l\'ajout de Clusters pour l\'environnement')
  }
}

export const removeClustersFromEnvironmentBusiness = async (
  clusters: (Cluster & { kubeconfig: Kubeconfig })[],
  environmentName: Environment['name'],
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
    if (addClusterExecResult.failed) throw new Error('Echec des services à la suppression de Clusters pour l\'environnement')
  }
}
