import type { Cluster, Environment, Project, Stage, User } from '@prisma/client'
import {
  addLogs,
  deleteEnvironment as deleteEnvironmentQuery,
  getEnvironmentsByProjectId,
  initializeEnvironment,
  updateEnvironment as updateEnvironmentQuery,
} from '@old-server/resources/queries-index'
import type { Resources, UserDetails } from '@old-server/types/index'
import { hook } from '@old-server/utils/hook-wrapper'
import prisma from '@old-server/prisma'
import { Result } from '@old-server/utils/business'

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
    const resourceCheckResult = await checkClusterResources(input, cluster)
    if (resourceCheckResult.isError) {
      errorMessages.push(resourceCheckResult.error)
    }
    const project = await prisma.project.findUniqueOrThrow({ where: { id: input.projectId } })
    const projectCheckResult = await checkProjectResources(input, project)
    if (projectCheckResult.isError) {
      errorMessages.push(projectCheckResult.error)
    }
  }
  if (errorMessages.length > 0) {
    return Result.fail(errorMessages.join('\n'))
  }
  return Result.succeed(true)
}

export async function checkClusterResources(input: {
  cpu: Environment['cpu']
  gpu: Environment['gpu']
  memory: Environment['memory']
}, cluster: Cluster): Promise<Result<boolean>> {
  if (cluster.cpu === 0 && cluster.memory === 0) {
    // Unconfigured cluster
    return Result.succeed(true)
  }
  const unsufficientResource = await getOverflowResources({
    request: { cpu: input.cpu, gpu: input.gpu, memory: input.memory },
    limit: { cpu: cluster.cpu, gpu: cluster.gpu, memory: cluster.memory },
    where: {
      cluster: {
        id: cluster.id,
      },
    },
  })
  if (unsufficientResource.length > 0) {
    return Result.fail(`Le cluster ne dispose pas de suffisamment de ressources : ${unsufficientResource.join(', ')}.`)
  }
  return Result.succeed(true)
}

export async function checkProjectResources(input: {
  cpu: Environment['cpu']
  gpu: Environment['gpu']
  memory: Environment['memory']
  stageId: Environment['stageId']
}, project: Project): Promise<Result<boolean>> {
  if (project.limitless) {
    // No limits
    return Result.succeed(true)
  }
  const stage = await prisma.stage.findUnique({ where: { id: input.stageId } })
  const prodStages = await prisma.stage.findMany({ select: { id: true }, where: { name: 'prod' } })
  let overflowResources: string[]
  if (stage?.name === 'prod') {
    overflowResources = await getOverflowResources({
      request: { cpu: input.cpu, gpu: input.gpu, memory: input.memory },
      limit: { cpu: project.prodCpu, gpu: project.prodGpu, memory: project.prodMemory },
      where: {
        projectId: project.id,
        stageId: {
          in: prodStages.map(s => s.id),
        },
      },
    })
  } else { // hprod
    overflowResources = await getOverflowResources({
      request: { cpu: input.cpu, gpu: input.gpu, memory: input.memory },
      limit: { cpu: project.hprodCpu, gpu: project.hprodGpu, memory: project.hprodMemory },
      where: {
        projectId: project.id,
        stageId: {
          notIn: prodStages.map(s => s.id),
        },
      },
    })
  }
  if (overflowResources.length > 0) {
    return Result.fail(`Le projet ne dispose pas de suffisamment de ressources : ${overflowResources.join(', ')}.`)
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
    select: { cluster: true, projectId: true, stageId: true },
    where: { id: input.environmentId },
  })
  const cluster = await prisma.cluster.findUniqueOrThrow({
    where: { id: environment.cluster.id },
  })
  const errorMessages: string[] = []
  const resourceCheckResult = await checkClusterResources(input, cluster)
  if (resourceCheckResult.isError) {
    errorMessages.push(resourceCheckResult.error)
  }
  const project = await prisma.project.findUniqueOrThrow({ where: { id: environment.projectId } })
  const projectCheckResult = await checkProjectResources({ stageId: environment.stageId, ...input }, project)
  if (projectCheckResult.isError) {
    errorMessages.push(projectCheckResult.error)
  }
  if (errorMessages.length > 0) {
    return Result.fail(errorMessages.join('\n'))
  }
  return Result.succeed(true)
}

export async function getOverflowResources({ request, limit, where }: {
  request: Resources
  limit: Resources
  where: any
}): Promise<string[]> {
  if (limit.cpu === 0 && limit.memory === 0) {
    // Unconfigured project prod resources
    return []
  }
  const environmentResources = await prisma.environment.aggregate({
    _sum: {
      memory: true,
      cpu: true,
      gpu: true,
    },
    where,
  })
  const unsufficientResource: string[] = []
  if ((environmentResources._sum.cpu ?? 0) + request.cpu > limit.cpu) {
    unsufficientResource.push('CPU')
  }
  if ((environmentResources._sum.gpu ?? 0) + request.gpu > limit.gpu) {
    unsufficientResource.push('GPU')
  }
  if ((environmentResources._sum.memory ?? 0) + request.memory > limit.memory) {
    unsufficientResource.push('Mémoire')
  }
  return unsufficientResource
}
