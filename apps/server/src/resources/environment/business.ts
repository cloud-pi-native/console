import type { Cluster, Environment, Project, Quota, Stage, User } from '@prisma/client'
import { XOR } from '@cpn-console/shared'
import {
  addLogs,
  deleteEnvironment as deleteEnvironmentQuery,
  getEnvironmentInfos as getEnvironmentInfosQuery,
  getPublicClusters,
  initializeEnvironment,
  updateEnvironment as updateEnvironmentQuery,
  getEnvironmentsByProjectId,
} from '@/resources/queries-index.js'
import type { UserDetails } from '@/types/index.js'
import {
  ErrorResType,
  BadRequest400,
  NotFound404,
  Unprocessable422,
} from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'
import prisma from '@/prisma.js'

// Fetch infos
export const getEnvironmentInfosAndClusters = async (environmentId: string) => {
  const env = await getEnvironmentInfosQuery(environmentId)
  if (!env) return new NotFound404()

  const authorizedClusters = [...await getPublicClusters(), ...env.project.clusters]
  return { env, authorizedClusters }
}

export const getEnvironmentInfos = async (environmentId: string) => getEnvironmentInfosQuery(environmentId)

export const getProjectEnvironments = (
  projectId: Project['id'],
) => getEnvironmentsByProjectId(projectId)

// Routes logic
type CreateEnvironmentParam = {
  userId: User['id']
  projectId: Project['id']
  name: Environment['name']
  clusterId: Environment['clusterId']
  quotaId: Quota['id']
  stageId: Stage['id']
  requestId: string
}

export const createEnvironment = async (
  {
    userId,
    projectId,
    name,
    clusterId,
    quotaId,
    stageId,
    requestId,
  }: CreateEnvironmentParam) => {
  const environment = await initializeEnvironment({ projectId, name, clusterId, quotaId, stageId })

  const { results } = await hook.project.upsert(projectId)
  await addLogs('Create Environment', results, userId, requestId)
  if (results.failed) {
    return new Unprocessable422('Echec des services à la création de l\'environnement')
  }

  return {
    ...environment,
    quotaId,
    stageId,
  }
}

type UpdateEnvironmentParam = {
  user: UserDetails
  environmentId: Environment['id']
  quotaId: Quota['id']
  requestId: string
}

export const updateEnvironment = async ({
  user,
  environmentId,
  requestId,
  quotaId,
}: UpdateEnvironmentParam) => {
  // Modification du quota
  const env = await updateEnvironmentQuery({ id: environmentId, quotaId })
  if (quotaId) {
    const { results } = await hook.project.upsert(env.projectId)
    await addLogs('Update Environment Quotas', results, user.id, requestId)
    if (results.failed) {
      return new Unprocessable422('Echec des services à la mise à jour des quotas pour l\'environnement')
    }
  }

  return env
}

type DeleteEnvironmentParam = {
  userId: User['id']
  environmentId: Environment['id']
  projectId: Project['id']
  requestId: string
}

export const deleteEnvironment = async ({
  userId,
  environmentId,
  projectId,
  requestId,
}: DeleteEnvironmentParam) => {
  await deleteEnvironmentQuery(environmentId)

  const { results } = await hook.project.upsert(projectId)
  await addLogs('Delete Environment', results, userId, requestId)
  if (results.failed) {
    return new Unprocessable422('Echec des services à la suppression de l\'environnement')
  }
  return null
}

type checkEnvironmentInput = {
  allowInvalidQuotaStage: boolean
  allowPrivateQuota: boolean
  quotaId: Quota['id']
} & XOR<{ // mode create
  clusterId: Cluster['id']
  projectId: Project['id']
  name: Environment['name']
  stageId: Stage['id']
}, {
    environmentId: Environment['id'] // mode update
  }>
export const checkEnvironmentInput = async (input: checkEnvironmentInput): Promise<ErrorResType | undefined> => {
  const [quota, environment, stage, sameNameEnvironment, cluster] = await Promise.all([
    prisma.quota.findUnique({ where: { id: input.quotaId }, include: { stages: true } }),
    input.environmentId
      ? prisma.environment.findUnique({ where: { id: input.environmentId } })
      : undefined,
    input.stageId
      ? prisma.stage.findUnique({ where: { id: input.stageId } })
      : undefined,
    input.name
      ? prisma.environment.findUnique({ where: { projectId_name: { projectId: input.projectId, name: input.name } } })
      : undefined,
    input.clusterId
      ? prisma.cluster.findFirst({
        where: {
          OR: [{ // un cluster public
            id: input.clusterId,
            privacy: 'public',
          }, {
            id: input.clusterId, // un cluster dédié rattaché au projet
            privacy: 'dedicated',
            projects: { some: { id: input.projectId } },
          }, {
            id: input.clusterId, // le cluster actuel de l'environment
            environments: { some: { id: input.environmentId } },
          }],
        },
      })
      : undefined,
  ])
  const quotaError = new BadRequest400('Quota invalide.')
  if (!quota) return quotaError

  // update
  if (input.environmentId && (quota.id !== environment?.quotaId && quota.isPrivate && !input.allowPrivateQuota)) return quotaError
  if (input.environmentId && quota.id) return

  // create
  if (quota.isPrivate && !input.allowPrivateQuota) return quotaError
  if (sameNameEnvironment) return new BadRequest400('Ce nom d\'environnement est déjà pris.')
  if (!cluster) return new BadRequest400('Cluster invalide.')
  if (!stage) return new BadRequest400('Type d\'environnment invalide.')
  if (!input.allowInvalidQuotaStage && !quota.stages.find(stage => stage.id === input.stageId)) return new BadRequest400('Ce quota n\'est pas disponible pour le type d\'environnement choisi.')
}
