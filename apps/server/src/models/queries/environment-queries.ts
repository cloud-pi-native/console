import { Environment, Project } from '@prisma/client'
import { prisma } from '../../connect.js'
// import { getEnvironmentModel } from '../environment.js'
// import { getProjectModel } from '../project.js'
import { getProjectById } from './project-queries.js'

// SELECT
export const getEnvironmentById = async (id: Environment['id']) => {
  return prisma.environment.findUnique({
    where: { id },
  })
}

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
// TODO Prisma
export const initializeEnvironment = async ({ name, projectId }: { name: Environment['name'], projectId: Project['id'] }) => {
  return prisma.environment.create({
    data: {
      project: {
        connect: {
          id: projectId,
        },
      },
      name,
      status: 'initializing',
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

export const deleteEnvironment = async (id: Environment['id']) => {
  await prisma.environment.delete({
    where: {
      id,
    },
  })
}

// TECH
export const _dropEnvironmentsTable = async () => {
  await prisma.environment.deleteMany({})
}
