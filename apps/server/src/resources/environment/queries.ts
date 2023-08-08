import { Environment, Project, Role } from '@prisma/client'
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

export const getEnvironment = async ({ projectId, name }: { projectId: Project['id'], name: Environment['name'] }) => {
  return prisma.environment.findFirst({
    where: { name, projectId },
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

// INSERT
export const initializeEnvironment = async ({ name, projectId, projectOwners }: { name: Environment['name'], projectId: Project['id'], projectOwners: Role[] }) => {
  return prisma.environment.create({
    data: {
      project: {
        connect: {
          id: projectId,
        },
      },
      name,
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
