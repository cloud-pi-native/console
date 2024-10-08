import type { Cluster, Environment, Project, Quota, Stage, User } from '@prisma/client'
import type { XOR } from '@cpn-console/shared'
import {
  addLogs,
  deleteEnvironment as deleteEnvironmentQuery,
  getEnvironmentInfos as getEnvironmentInfosQuery,
  getEnvironmentsByProjectId,
  getPublicClusters,
  initializeEnvironment,
  updateEnvironment as updateEnvironmentQuery,
} from '@/resources/queries-index.js'
import type { UserDetails } from '@/types/index.js'
import type {
  ErrorResType,
} from '@/utils/errors.js'
import {
  BadRequest400,
  NotFound404,
  Unprocessable422,
} from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'
import prisma from '@/prisma.js'

// Fetch infos
export async function getEnvironmentInfosAndClusters(environmentId: string) {
  const env = await getEnvironmentInfosQuery(environmentId)
  if (!env) return new NotFound404()

  const authorizedClusters = [...await getPublicClusters(), ...env.project.clusters]
  return { env, authorizedClusters }
}

export const getEnvironmentInfos = async (environmentId: string) => getEnvironmentInfosQuery(environmentId)

export function getProjectEnvironments(projectId: Project['id']) {
  return getEnvironmentsByProjectId(projectId)
}

// Routes logic
interface CreateEnvironmentParam {
  userId: User['id']
  projectId: Project['id']
  name: Environment['name']
  clusterId: Environment['clusterId']
  quotaId: Quota['id']
  stageId: Stage['id']
  requestId: string
}

export async function createEnvironment({
  userId,
  projectId,
  name,
  clusterId,
  quotaId,
  stageId,
  requestId,
}: CreateEnvironmentParam) {
  const environment = await initializeEnvironment({ projectId, name, clusterId, quotaId, stageId })

  const { results } = await hook.project.upsert(projectId)
  await addLogs({ action: 'Create Environment', data: results, userId, requestId, projectId })
  if (results.failed) {
    return new Unprocessable422('Echec des services à la création de l\'environnement')
  }

  return {
    ...environment,
    quotaId,
    stageId,
  }
}

interface UpdateEnvironmentParam {
  user: UserDetails
  environmentId: Environment['id']
  quotaId: Quota['id']
  requestId: string
}

export async function updateEnvironment({
  user,
  environmentId,
  requestId,
  quotaId,
}: UpdateEnvironmentParam) {
  // Modification du quota
  const env = await updateEnvironmentQuery({ id: environmentId, quotaId })
  if (quotaId) {
    const { results } = await hook.project.upsert(env.projectId)
    await addLogs({ action: 'Update Environment Quotas', data: results, userId: user.id, requestId, projectId: env.projectId })
    if (results.failed) {
      return new Unprocessable422('Echec des services à la mise à jour des quotas pour l\'environnement')
    }
  }

  return env
}

interface DeleteEnvironmentParam {
  userId?: User['id']
  environmentId: Environment['id']
  projectId: Project['id']
  requestId: string
}

export async function deleteEnvironment({
  userId,
  environmentId,
  projectId,
  requestId,
}: DeleteEnvironmentParam) {
  const env = await deleteEnvironmentQuery(environmentId)

  const { results } = await hook.project.upsert(projectId)
  await addLogs({ action: 'Delete Environment', data: results, userId, requestId, projectId: env.projectId })
  if (results.failed) {
    return new Unprocessable422('Echec des services à la suppression de l\'environnement')
  }
  return null
}

type CheckEnvironmentInput = {
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
export async function checkEnvironmentInput(input: CheckEnvironmentInput): Promise<ErrorResType | undefined> {
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
