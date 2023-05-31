import { Environments, Projects, Roles } from '@prisma/client'
import prisma from '@/prisma.js'
import { getProjectById } from './project-queries.js'
import { dbKeysExcluded, exclude } from '@/utils/queries-tools.js'

// SELECT
export const getEnvironmentById = async (id: Environments['id']) => {
  return prisma.environments.findUnique({
    where: { id },
  })
}

export const getEnvironmentInfos = async (id: Environments['id']) => {
  return exclude(await prisma.environments.findUnique({
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
        },
      },
      permissions: {
        include: {
          user: true,
        },
      },
    },
  }), dbKeysExcluded)
}

export const getEnvironment = async ({ projectId, name }: { projectId: Projects['id'], name: Environments['name'] }) => {
  return prisma.environments.findFirst({
    where: { name, projectId },
    include: { project: true },
  })
}

export const getEnvironmentsByProjectId = async (projectId: Projects['id']) => {
  return prisma.environments.findMany({
    where: { projectId },
    include: { project: true },
  })
}

export const getProjectByEnvironmentId = async (environmentId: Environments['id']) => {
  const env = await getEnvironmentById(environmentId)
  return getProjectById(env.projectId)
}

// INSERT
export const initializeEnvironment = async ({ name, projectId, projectOwners }: { name: Environments['name'], projectId: Projects['id'], projectOwners: Roles[] }) => {
  return prisma.environments.create({
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

export const updateEnvironmentCreated = async (id: Environments['id']) => {
  return prisma.environments.update({
    where: {
      id,
    },
    data: {
      status: 'created',
    },
  })
}

export const updateEnvironmentFailed = async (id: Environments['id']) => {
  return prisma.environments.update({
    where: {
      id,
    },
    data: {
      status: 'failed',
    },
  })
}

// DELETE
export const updateEnvironmentDeleting = async (id: Environments['id']) => {
  const doesEnvExist = await getEnvironmentById(id)
  if (!doesEnvExist) throw new Error('L\'environnement demandé n\'existe pas en base pour ce projet')
  return prisma.environments.update({
    where: {
      id,
    },
    data: {
      status: 'deleting',
    },
  })
}

export const deleteEnvironment = async (id: Environments['id']) => {
  await prisma.environments.delete({
    where: {
      id,
    },
  })
}

// TECH
export const _dropEnvironmentsTable = async () => {
  await prisma.environments.deleteMany({})
}

export const _createEnvironment = async (data: Parameters<typeof prisma.environments.create>[0]['data']) => {
  await prisma.environments.create({ data })
}
