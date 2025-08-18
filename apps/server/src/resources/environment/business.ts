import type { Cluster, Environment, Project, Stage, User } from '@prisma/client'
import type { XOR } from '@cpn-console/shared'
import {
  addLogs,
  deleteEnvironment as deleteEnvironmentQuery,
  getEnvironmentsByProjectId,
  initializeEnvironment,
  updateEnvironment as updateEnvironmentQuery,
} from '@/resources/queries-index.js'
import type { UserDetails } from '@/types/index.js'
import type {
  ErrorResType,
} from '@/utils/errors.js'
import {
  BadRequest400,
  Unprocessable422,
} from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'
import prisma from '@/prisma.js'

export function getProjectEnvironments(projectId: Project['id']) {
  return getEnvironmentsByProjectId(projectId)
}

// Routes logic
interface CreateEnvironmentParam {
  userId: User['id']
  projectId: Project['id']
  name: Environment['name']
  cpu: Environment['cpu']
  gpu: Environment['gpu']
  memory: Environment['memory']
  clusterId: Environment['clusterId']
  stageId: Stage['id']
  requestId: string
}

export async function createEnvironment({
  userId,
  projectId,
  name,
  cpu,
  gpu,
  memory,
  clusterId,
  stageId,
  requestId,
}: CreateEnvironmentParam) {
  const environment = await initializeEnvironment({ projectId, name, cpu, gpu, memory, clusterId, stageId })

  const { results } = await hook.project.upsert(projectId)
  await addLogs({ action: 'Create Environment', data: results, userId, requestId, projectId })
  if (results.failed) {
    return new Unprocessable422('Echec des services à la création de l\'environnement')
  }

  return {
    ...environment,
    stageId,
  }
}

interface UpdateEnvironmentParam {
  user: UserDetails
  environmentId: Environment['id']
  cpu: Environment['cpu']
  gpu: Environment['gpu']
  memory: Environment['memory']
  requestId: string
}

export async function updateEnvironment({
  user,
  environmentId,
  requestId,
  cpu,
  gpu,
  memory,
}: UpdateEnvironmentParam) {
  const env = await updateEnvironmentQuery({
    id: environmentId,
    cpu,
    gpu,
    memory,
  })
  const { results } = await hook.project.upsert(env.projectId)
  await addLogs({ action: 'Update Environment', data: results, userId: user.id, requestId, projectId: env.projectId })
  if (results.failed) {
    return new Unprocessable422('Echec des services à la mise à jour de l\'environnement')
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
  cpu: Environment['cpu']
  gpu: Environment['gpu']
  memory: Environment['memory']
} & XOR<{ // mode create
  clusterId: Cluster['id']
  projectId: Project['id']
  name: Environment['name']
  stageId: Stage['id']
}, {
    environmentId: Environment['id'] // mode update
  }>
export async function checkEnvironmentInput(input: CheckEnvironmentInput): Promise<ErrorResType | undefined> {
  const [stage, sameNameEnvironment, cluster] = await Promise.all([
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

  // update
  // TODO Check cluster capacity for updated resources

  // create
  if (sameNameEnvironment) return new BadRequest400('Ce nom d\'environnement est déjà pris.')
  if (!cluster) return new BadRequest400('Cluster invalide.')
  if (!stage) return new BadRequest400('Type d\'environnment invalide.')
}
