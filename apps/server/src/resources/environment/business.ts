import type { Cluster, Environment, Project, QuotaStage, Role, User } from '@prisma/client'
import { EnvironmentSchema, adminGroupPath } from '@cpn-console/shared'
import { getProjectInfosAndClusters } from '@/resources/project/business.js'
import {
  addLogs,
  deleteEnvironment as deleteEnvironmentQuery,
  getClusterById,
  getEnvironmentInfos as getEnvironmentInfosQuery,
  getProjectInfos,
  getPublicClusters,
  getQuotaById,
  getQuotaStageById,
  getStageById,
  getUserById,
  initializeEnvironment,
  updateEnvironment as updateEnvironmentQuery,
} from '@/resources/queries-index.js'
import type { UserDetails } from '@/types/index.js'
import { validateSchema } from '@/utils/business.js'
import {
  checkClusterUnavailable,
  checkInsufficientRoleInProject,
  checkRoleAndLocked,
  filterOwners,
} from '@/utils/controller.js'
import { BadRequestError, DsoError, ForbiddenError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

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
    if (!quotaStage) throw new BadRequestError('L\'association quota stage demandée n\'existe pas')
    const quota = await getQuotaById(quotaStage.quotaId)
    const stageClusters = (await getStageById(quotaStage?.stageId))?.clusters
    const authorizedClusters = projectClusters
      ?.filter(projectCluster => stageClusters
        ?.find(stageCluster => stageCluster.id === projectCluster.id))
    return { user, project, quota, quotaStage, authorizedClusters }
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
  quotaStage: QuotaStage,
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
  if (quotaStage.status !== 'active') return 'Cette association quota / type d\'environnement n\'est plus disponible.'
}

// Routes logic
type CreateEnvironmentParam = {
  userId: User['id'],
  projectId: Project['id'],
  name: Environment['name'],
  clusterId: Environment['clusterId'],
  quotaStageId: QuotaStage['id'],
  requestId: string
}

export const createEnvironment = async (
  {
    userId,
    projectId,
    name,
    clusterId,
    quotaStageId,
    requestId,
  }: CreateEnvironmentParam) => {
  const schemaValidation = EnvironmentSchema
    .omit({
      id: true,
      permissions: true,
    })
    .safeParse({
      name,
      projectId,
      clusterId,
      quotaStageId,
    })
  validateSchema(schemaValidation)

  const { user, project, quotaStage, quota, authorizedClusters } = await getInitializeEnvironmentInfos({
    userId,
    projectId,
    quotaStageId,
  })

  if (!project) throw new NotFoundError('Projet introuvable')
  if (!user) throw new NotFoundError('Utilisateur introuvable')
  if (!quota) throw new NotFoundError('Quota introuvable')

  checkCreateEnvironment({
    project,
    userId,
    name,
    authorizedClusterIds: authorizedClusters.map(authorizedCluster => authorizedCluster.id),
    clusterId,
    quotaStage,
  })

  const projectOwners = filterOwners(project.roles)
  const environment = await initializeEnvironment({ projectId: project.id, name, projectOwners, clusterId, quotaStageId })

  try {
    const cluster = await getClusterById(clusterId)
    if (!cluster) throw new NotFoundError('Cluster introuvable')

    const { results } = await hook.project.upsert(project.id)

    await addLogs('Create Environment', results, userId, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec services à la création de l\'environnement')
    }

    return environment
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

type UpdateEnvironmentParam = {
  user: UserDetails,
  projectId: Project['id'],
  environmentId: Environment['id'],
  quotaStageId: QuotaStage['id'],
  clusterId: Cluster['id'],
  requestId: string,
}

export const updateEnvironment = async ({
  user,
  projectId,
  environmentId,
  quotaStageId,
  clusterId,
  requestId,
}: UpdateEnvironmentParam) => {
  try {
    const { project, quotaStage, quota } = await getInitializeEnvironmentInfos({
      userId: user.id,
      projectId,
      quotaStageId,
    })

    if (!project) throw new NotFoundError('Projet introuvable')
    if (!quota) throw new NotFoundError('Quota introuvable')

    if (!user.groups?.includes(adminGroupPath)) {
      checkUpdateEnvironment({
        project,
        userId: user.id,
        quotaStage,
      })
    }

    // Modification du quota
    const environment = await updateEnvironmentQuery({ id: environmentId, quotaStageId: quotaStage.id })
    if (quotaStage) {
      const cluster = await getClusterById(clusterId)
      if (!cluster) throw new NotFoundError('Cluster introuvable')

      const { results } = await hook.project.upsert(project.id)

      await addLogs('Update Environment Quotas', results, user.id, requestId)
      if (results.failed) {
        throw new UnprocessableContentError('Echec services à la mise à jour des quotas pour l\'environnement')
      }
    }

    return environment
  } catch (error) {
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
  requestId: string,
}

export const deleteEnvironment = async ({
  userId,
  projectId,
  environmentId,
  requestId,
}: DeleteEnvironmentParam) => {
  try {
    const environment = await getEnvironmentInfos(environmentId)
    const project = await getProjectInfos(projectId)
    if (!project) throw new NotFoundError('Projet introuvable')

    checkDeleteEnvironment({ project, userId })

    await deleteEnvironmentQuery(environment.id)

    // Suppression de l'environnement dans les services
    const cluster = await getClusterById(environment.clusterId)
    if (!cluster) throw new NotFoundError('Cluster introuvable')
    const { results } = await hook.project.upsert(project.id)

    await addLogs('Delete Environment', results, userId, requestId)
    if (results.failed) {
      throw new Error('Echec des services à la suppression de l\'environnement')
    }
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}
