import type { Cluster, Environment, Project, Stage, User } from '@prisma/client'
import {
  addLogs,
  deleteEnvironment as deleteEnvironmentQuery,
  getEnvironmentsByProjectId,
  initializeEnvironment,
  updateEnvironment as updateEnvironmentQuery,
} from '@/resources/queries-index.js'
import type { UserDetails } from '@/types/index.js'
import { hook } from '@/utils/hook-wrapper.js'
import prisma from '@/prisma.js'
import { Result } from '@/utils/business.js'

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

interface CreateEnvironmentResult {
  id: Environment['id']
  createdAt: Date
  updatedAt: Date
  projectId: Project['id']
  name: Environment['name']
  cpu: Environment['cpu']
  gpu: Environment['gpu']
  memory: Environment['memory']
  clusterId: Environment['clusterId']
  stageId: Stage['id']
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
}: CreateEnvironmentParam): Promise<Result<CreateEnvironmentResult>> {
  const environment = await initializeEnvironment({ projectId, name, cpu, gpu, memory, clusterId, stageId })

  const { results } = await hook.project.upsert(projectId)
  await addLogs({ action: 'Create Environment', data: results, userId, requestId, projectId })
  if (results.failed) {
    return Result.fail('Echec des services à la création de l\'environnement')
  }

  return Result.succeed({
    ...environment,
    stageId,
  })
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
    return Result.fail('Echec des services à la mise à jour de l\'environnement')
  }

  return Result.succeed(env)
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
    return Result.fail('Echec des services à la suppression de l\'environnement')
  }
  return Result.succeed(null)
}

export async function checkEnvironmentCreate(input: {
  clusterId: Cluster['id']
  projectId: Project['id']
  name: Environment['name']
  stageId: Stage['id']
  cpu: Environment['cpu']
  gpu: Environment['gpu']
  memory: Environment['memory']
}): Promise<Result<boolean>> {
  const errorMessages: string[] = []
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
            }],
          },
        })
      : undefined,
  ])
  if (sameNameEnvironment) errorMessages.push('Ce nom d\'environnement est déjà pris.')
  if (!stage) errorMessages.push('Type d\'environnment invalide.')
  if (!cluster) {
    errorMessages.push('Cluster invalide.')
  } else {
    const resourceCheckResult = await checkResources(input, cluster)
    if (!resourceCheckResult.success) {
      errorMessages.push(resourceCheckResult.error)
    }
  }
  if (errorMessages.length > 0) {
    return Result.fail(errorMessages.join('\n'))
  }
  return Result.succeed(true)
}

export async function checkResources(input: {
  cpu: Environment['cpu']
  gpu: Environment['gpu']
  memory: Environment['memory']
}, cluster: Cluster): Promise<Result<boolean>> {
  if (cluster.cpu === 0 && cluster.memory === 0) {
    // Unconfigured cluster
    return Result.succeed(true)
  }
  const envs = await prisma.environment.aggregate({
    _sum: {
      memory: true,
      cpu: true,
      gpu: true,
    },
    where: {
      cluster: {
        id: cluster.id,
      },
    },
  })
  const unsufficientResource: string[] = []
  if (envs._sum.cpu !== null && (envs._sum.cpu + input.cpu > cluster.cpu)) {
    unsufficientResource.push('CPU')
  }
  if (envs._sum.gpu !== null && (envs._sum.gpu + input.gpu > cluster.gpu)) {
    unsufficientResource.push('GPU')
  }
  if (envs._sum.memory !== null && (envs._sum.memory + input.memory > cluster.memory)) {
    unsufficientResource.push('Mémoire')
  }
  if (unsufficientResource.length > 0) {
    return Result.fail(`Le cluster ne dispose pas de suffisamment de ressources : ${unsufficientResource.join(', ')}.`)
  }
  return Result.succeed(true)
}

export async function checkEnvironmentUpdate(input: {
  environmentId: Environment['id']
  cpu: Environment['cpu']
  gpu: Environment['gpu']
  memory: Environment['memory']
}): Promise<Result<boolean>> {
  const environment = await prisma.environment.findUniqueOrThrow({
    select: { cluster: true },
    where: { id: input.environmentId },
  })
  const cluster = await prisma.cluster.findUniqueOrThrow({
    where: { id: environment.cluster.id },
  })
  return checkResources(input, cluster)
}
