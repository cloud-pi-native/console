import { prisma } from '../../connect.js'
// import { getEnvironmentModel } from '../environment.js'
// import { getProjectModel } from '../project.js'
import { getProjectById } from './project-queries.js'

// SELECT
export const getEnvironmentById = async (id) => {
  return prisma.environment.findUnique({
    where: { id },
  })
}

export const getEnvironment = async ({ projectId, name }) => {
  return prisma.environment.findUnique({
    where: { name, projectId },
    include: { project: true },
  })
}

export const getEnvironmentsByProjectId = async (projectId) => {
  return prisma.environment.findMany({
    where: { projectId },
    include: { project: true },
  })
}

export const getProjectByEnvironmentId = async (environmentId) => {
  const env = await getEnvironmentById(environmentId)
  return getProjectById(env.projectId)
}

// INSERT
// TODO Prisma
export const initializeEnvironment = async ({ name, projectId }) => {
  return prisma.environment.create({
    data: {
      name,
      projectId,
      status: 'initializing',
    },
  })

  // return getEnvironmentModel().create(
  //   { name, projectId, status: 'initializing' }, {
  //     where: {
  //       name,
  //       projectId,
  //     },
  //     include: {
  //       model: getProjectModel(),
  //     },
  //   })
}

export const updateEnvironmentCreated = async (id) => {
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      status: 'created',
    },
  })
}

export const updateEnvironmentFailed = async (id) => {
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
export const updateEnvironmentDeleting = async (id) => {
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

export const deleteEnvironment = async (id) => {
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
