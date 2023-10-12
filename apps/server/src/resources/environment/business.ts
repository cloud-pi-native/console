import {
  addLogs,
  getEnvironmentInfos as getEnvironmentInfosQuery,
  getPublicClusters,
  updateEnvironmentCreated,
  updateEnvironmentFailed,
  lockProject,
  initializeEnvironment,
  updateEnvironmentDeleting,
  deleteEnvironment as deleteEnvironmentQuery,
  getUserById,
  getQuotas as getQuotasQuery,
  updateEnvironment as updateEnvironmentQuery,
  getStages as getStagesQuery,
  getStageById,
  getClusterById,
  getProjectInfos,
  getQuotaStageById,
} from '@/resources/queries-index.js'
import { hooks } from '@/plugins/index.js'
import { DsoError, ForbiddenError, NotFoundError, UnauthorizedError, UnprocessableContentError } from '@/utils/errors.js'
import { type Cluster, type Environment, type Project, type Role, type User, type QuotaStage, Organization } from '@prisma/client'
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

type GetInitializeEnvironmentInfosParam = {
  userId: User['id'],
  projectId: Project['id'],
  quotaStageId: QuotaStage['id'],
}

export const getInitializeEnvironmentInfos = async ({
  userId,
  projectId,
  quotaStageId,
}: GetInitializeEnvironmentInfosParam) => {
  try {
    const user = await getUserById(userId)
    const { project, projectClusters } = await getProjectInfosAndClusters(projectId)
    const quotaStage = await getQuotaStageById(quotaStageId)
    const stageClusters = (await getStageById(quotaStage?.stageId))?.clusters
    const authorizedClusters = projectClusters
      .filter(projectCluster => stageClusters
        ?.includes(projectCluster) ||
        projectCluster.privacy === 'public')

    return { user, project, quotaStage, authorizedClusters }
  } catch (error) {
    throw new Error(error?.message)
  }
}

// Check logic
type CheckEnvironmentParam = {
  project: { locked: boolean, roles: Role[], id: string, environments: Environment[] },
  userId: User['id'],
  name: Environment['name'],
  authorizedClusterIds: Cluster['id'][],
  clusterId: Cluster['id'],
  quotaStage: QuotaStage,
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
  userId,
  name,
  authorizedClusterIds,
  clusterId,
  quotaStage,
}: CheckEnvironmentParam) => {
  const errorMessage = checkRoleAndLocked(project, userId, 'owner') ||
  checkExistingEnvironment(clusterId, name, project.environments) ||
    checkClusterUnavailable(clusterId, authorizedClusterIds) ||
    checkQuotaStageStatus(quotaStage)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
}

type CheckUpdateEnvironmentParam = {
  project: { locked: boolean, roles: Role[], id: string, environments: Environment[] },
  userId: User['id'],
  quotaStage?: QuotaStage,
}

export const checkUpdateEnvironment = ({
  project,
  userId,
  quotaStage,
}: CheckUpdateEnvironmentParam) => {
  const errorMessage = checkRoleAndLocked(project, userId, 'owner') ||
    checkQuotaStageStatus(quotaStage)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
}

type CheckDeleteEnvironmentParam = {
  project: { locked: boolean, roles: Role[], id: string },
  userId: string,
}

export const checkDeleteEnvironment = ({
  project,
  userId,
}: CheckDeleteEnvironmentParam) => {
  const errorMessage = checkInsufficientRoleInProject(userId, { minRole: 'owner', roles: project.roles })
  if (errorMessage) throw new ForbiddenError(errorMessage, { description: '', extras: { userId, projectId: project.id } })
}

export const checkExistingEnvironment = (clusterId: Cluster['id'], name: Environment['name'], environments: Environment[]) => {
  if (environments?.find(env => env.clusterId === clusterId && env.name === name)) {
    return 'Un environnement avec le même nom et déployé sur le même cluster existe déjà pour ce projet.'
  }
}

export const checkQuotaStageStatus = (quotaStage: QuotaStage) => {
  if (quotaStage.status !== 'active') return 'Cette association quota / stage n\'est plus disponible.'
}

// Routes logic
type CreateEnvironmentParam = {
  userId: User['id'],
  projectId: Project['id'],
  name: Environment['name'],
  clusterId: Environment['clusterId'],
  quotaStageId: QuotaStage['id'],
}

export const createEnvironment = async (
  {
    userId,
    projectId,
    name,
    clusterId,
    quotaStageId,
  }: CreateEnvironmentParam) => {
  const { user, project, quotaStage, authorizedClusters } = await getInitializeEnvironmentInfos({
    userId,
    projectId,
    quotaStageId,
  })

  checkCreateEnvironment({
    project,
    userId,
    name,
    authorizedClusterIds: authorizedClusters.map(authorizedCluster => authorizedCluster.id),
    clusterId,
    quotaStage,
  })

  await lockProject(project.id)
  const projectOwners = filterOwners(project.roles)
  const environment = await initializeEnvironment({ projectId: project.id, name, projectOwners, clusterId, quotaStageId })

  try {
    const projectName = project.name
    const organizationName = project.organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organizationName}/${projectName}`
    const repositories = environment.project.repositories?.map(({ internalRepoName }) => ({
      url: `${gitlabBaseURL}/${internalRepoName}.git`,
      internalRepoName,
    }))

    const envData = {
      environment: name,
      project: projectName,
      organization: organizationName,
      repositories,
      owner: user,
    }
    const results = await hooks.initializeEnvironment.execute(envData)
    // @ts-ignore
    await addLogs('Create Environment', results, userId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec services à la création de l\'environnement')
    }

    const cluster = await getClusterById(clusterId)

    const addClusterExecResult = await hooks.addEnvironmentCluster.execute({
      environment: name,
      project: projectName,
      organization: organizationName,
      // @ts-ignore
      cluster: {
        ...cluster,
        ...cluster.kubeconfig,
      },
      owner: user,
    })
    // @ts-ignore
    await addLogs('Add Cluster to Environment', addClusterExecResult, userId)
    if (addClusterExecResult.failed) {
      throw new UnprocessableContentError('Echec des services à l\'ajout du cluster pour l\'environnement')
    }

    await updateEnvironmentCreated(environment.id)
    await unlockProjectIfNotFailed(project.id)
    return environment
  } catch (error) {
    await updateEnvironmentFailed(environment.id)
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

  type UpdateEnvironmentParam = {
    userId: User['id'],
    projectId: Project['id'],
    environmentId: Environment['id'],
    quotaStageId?: QuotaStage['id'],
  }

export const updateEnvironment = async ({
  userId,
  projectId,
  environmentId,
  quotaStageId,
}: UpdateEnvironmentParam) => {
  try {
    const project = await getProjectInfos(projectId)
    const quotaStage = await getQuotaStageById(quotaStageId)

    checkUpdateEnvironment({
      project,
      userId,
      quotaStage,
    })

    await lockProject(projectId)

    // Modification du quota
    if (quotaStage) {
      await updateEnvironmentQuery({ id: environmentId, quotaStageId: quotaStage.id })
    }

    // mise à jour des status
    await updateEnvironmentCreated(environmentId)
    await unlockProjectIfNotFailed(projectId)

    const environment = await getEnvironmentInfos(environmentId)

    return environment
  } catch (error) {
    await updateEnvironmentFailed(environmentId)
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

type DeleteEnvironmentParam = {
  userId: User['id'],
  projectId: Project['id'],
  environmentId: Environment['id'],
}

export const deleteEnvironment = async ({
  userId,
  projectId,
  environmentId,
}: DeleteEnvironmentParam) => {
  try {
    const environment = await getEnvironmentInfos(environmentId)
    const project = await getProjectInfos(projectId)

    checkDeleteEnvironment({ project, userId })

    await updateEnvironmentDeleting(environment.id)
    await lockProject(projectId)

    // Retrait du cluster pour l'environnement
    await removeClusterFromEnvironment({ userId, project, environment })

    // Suppression de l'environnement dans les services
    const projectName = project.name
    const organizationName = project.organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organizationName}/${projectName}`
    const repositories = environment.project.repositories.map(({ internalRepoName }) => ({
      url: `${gitlabBaseURL}/${internalRepoName}.git`,
      internalRepoName,
    }))
    const envData = {
      environment: environment.name,
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
    await deleteEnvironmentQuery(environmentId)
    await unlockProjectIfNotFailed(projectId)
  } catch (error) {
    await updateEnvironmentFailed(environmentId)
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

type removeClusterFromEnvironmentParam = {
  userId: User['id'],
  project: {
    id: Project['id'],
    name: Project['name'],
    organization: Organization
  },
  environment: Environment,
}

export const removeClusterFromEnvironment = async ({
  userId,
  project,
  environment,
}: removeClusterFromEnvironmentParam) => {
  const cluster = await getClusterById(environment.clusterId)
  const removeClusterExecResult = await hooks.removeEnvironmentCluster.execute({
    environment: environment.name,
    project: project.name,
    organization: project.organization.name,
    // @ts-ignore
    cluster: {
      ...cluster,
      ...cluster.kubeconfig,
    },
  })
  // @ts-ignore
  await addLogs('Remove Cluster from Environment', removeClusterExecResult, userId)
  if (removeClusterExecResult.failed) throw new UnprocessableContentError('Echec des services à la suppression de Clusters pour l\'environnement')
}
