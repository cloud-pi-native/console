import { DsoEnvironment, Environment, Project, Quota, Role } from '@prisma/client'
import prisma from '@/prisma.js'
import { getProjectById } from '../project/queries.js'

// SELECT
export const getEnvironmentById = async (id: Environment['id']) => {
  return prisma.environment.findUnique({
    where: { id },
  })
}

export const getEnvironmentInfos = (id: Environment['id']) => prisma.environment.findUnique({
  where: { id },
  include: {
    project: {
      select: {
        organization: true,
        roles: {
          include: {
            user: true,
          },
        },
        name: true,
        id: true,
        status: true,
        services: false,
        repositories: {
          where: {
            isInfra: true,
          },
        },
        locked: true,
        clusters: {
          select: {
            id: true,
            label: true,
            privacy: true,
            clusterResources: true,
          },
        },
      },
    },
    permissions: {
      include: {
        user: true,
      },
    },
    clusters: {
      select: {
        id: true,
        label: true,
        privacy: true,
        clusterResources: true,
      },
    },
  },
})

export const getEnvironment = async ({ projectId, dsoEnvironmentId }: { projectId: Project['id'], dsoEnvironmentId: Environment['dsoEnvironmentId'] }) => {
  return prisma.environment.findFirst({
    where: { dsoEnvironmentId, projectId },
    include: { project: true },
  })
}

export const getEnvironmentsByProjectId = async (projectId: Project['id']) => {
  return prisma.environment.findMany({
    where: { projectId },
    include: { project: true },
  })
}

export const getProjectByEnvironmentId = async (environmentId: Environment['id']) => {
  const env = await getEnvironmentById(environmentId)
  return getProjectById(env.projectId)
}

export const getQuotas = async () => {
  return prisma.quota.findMany()
}

export const getDsoEnvironments = async () => {
  return prisma.dsoEnvironment.findMany()
}

export const getDsoEnvironmentById = async (id: DsoEnvironment['id']) => {
  return prisma.dsoEnvironment.findUnique({
    where: { id },
  })
}

// INSERT
export const initializeEnvironment = async ({ dsoEnvironmentId, projectId, projectOwners, quotaId }: { dsoEnvironmentId: Environment['dsoEnvironmentId'], projectId: Project['id'], projectOwners: Role[], quotaId: Quota['id'] }) => {
  return prisma.environment.create({
    data: {
      project: {
        connect: {
          id: projectId,
        },
      },
      dsoEnvironment: {
        connect: {
          id: dsoEnvironmentId,
        },
      },
      quota: {
        connect: {
          id: quotaId,
        },
      },
      status: 'initializing',
      permissions: {
        createMany: {
          data: projectOwners.map(({ userId }) => ({ userId, level: 2 })),
        },
      },
    },
    include: {
      project: {
        include: {
          repositories: {
            where: {
              isInfra: true,
            },
          },
        },
      },
    },
  })
}

export const updateEnvironmentCreated = async (id: Environment['id']) => {
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      status: 'created',
    },
  })
}

export const updateEnvironmentFailed = async (id: Environment['id']) => {
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      status: 'failed',
    },
  })
}

export const updateEnvironment = async ({ id, quotaId }: { id: Environment['id'], quotaId: Quota['id'] }) => {
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      quotaId,
    },
  })
}

// DELETE
export const updateEnvironmentDeleting = async (id: Environment['id']) => {
  const doesEnvExist = await getEnvironmentById(id)
  if (!doesEnvExist) throw new Error('L\'environnement demandé n\'existe pas en base pour ce projet')
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      status: 'deleting',
    },
  })
}

export const deleteEnvironment = async (id: Environment['id']) => prisma.environment.delete({
  where: {
    id,
  },
})

// TECH
export const _dropEnvironmentsTable = async () => {
  await prisma.environment.deleteMany({})
}

export const _createEnvironment = async (data: Parameters<typeof prisma.environment.create>[0]['data']) => {
  await prisma.environment.create({ data })
}

export const _dropQuotaTable = async () => {
  await prisma.quota.deleteMany({})
}

export const _dropDsoEnvironmentTable = async () => {
  await prisma.dsoEnvironment.deleteMany({})
}
