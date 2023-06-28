import { prisma } from '../../connect.js'
import { getProjectModel } from '../project.js'
import { dbKeysExcluded, exclude } from '../../utils/queries-tools.js'
import { getPermissionModel } from '../permission.js'
import { getEnvironmentModel } from '../environment.js'
import { getRepositoryModel } from '../repository.js'
import { getUserModel } from '../user.js'
import { getOrganizationModel } from '../organization.js'

// SELECT
export const getAllProjects = async () => {
  return prisma.project.findMany()
}

// TODO Prisma
export const getProjectUsers = async (projectId) => {
  const res = await prisma.user.findMany({
    include: {
      UsersProjects: {
        where: {
          ProjectId: projectId,
        },
      },
    },
  })

  // const res = await getUserModel().findAll({
  //   include: {
  //     model: getProjectModel(),
  //     where: { id: projectId },
  //     attributes: { exclude: ['role'] },
  //   },
  // })

  const resWithKeysExcluded = exclude(res, ['role'])
  return resWithKeysExcluded
}

// TODO Prisma
export const getUserProjects = async (user) => {
  const res = await prisma.project.findMany({
    orderBy: {
      name: 'asc',
    },
    include: {
      organization: true,
      repositories: true,
      UsersProjects: true,
      environments: {
        include: {
          permissions: {
            where: { user: true },
          },
        },
      },
    },
  })

  // const res = await user?.getProjects({
  //   ...dbKeysExcluded,
  //   include: [
  //     {
  //       model: getEnvironmentModel(),
  //       include: {
  //         model: getPermissionModel(),
  //         include: {
  //           model: getUserModel(),
  //           attributes: { exclude: ['role'] },
  //         },
  //       },
  //       ...dbKeysExcluded,
  //     },
  //     {
  //       model: getUserModel(),
  //       attributes: { exclude: ['role'] },
  //     },
  //     {
  //       model: getRepositoryModel(),
  //       ...dbKeysExcluded,
  //     },
  //     {
  //       model: getOrganizationModel(),
  //       ...dbKeysExcluded,
  //     },
  //   ],
  //   order: [
  //     ['name', 'ASC'],
  //   ],
  // })
  const resWithKeysExcluded = exclude(res, dbKeysExcluded)
  return resWithKeysExcluded
}

export const getProjectById = async (id) => {
  return prisma.project.findUnique({ where: { id } })
}

export const getProject = async ({ name, organization }) => {
  const res = await prisma.project.findUnique({ where: { name, organization } })
  return res
}

// CREATE
export const initializeProject = async ({ name, organization, description }) => {
  return prisma.project.create({ data: { name, organization, description, status: 'initializing', locked: true } })
}

// UPDATE
export const lockProject = async (id) => {
  return prisma.project.update({ where: { id }, data: { locked: true } })
}

export const unlockProject = async (id) => {
  return prisma.project.update({ where: { id }, data: { locked: false } })
}

export const updateProjectCreated = async (id) => {
  return prisma.project.update({ where: { id }, data: { status: 'created' } })
}

export const updateProjectFailed = async (id) => {
  return prisma.project.update({ where: { id }, data: { status: 'failed' } })
}

// TODO Prisma
export const addUserToProject = async ({ project, user, role }) => {
  return user.addProject(project, { through: { role } })
}

// TODO Prisma
export const removeUserFromProject = async ({ project, user }) => {
  return user.removeProject(project)
}

export const updateProjectServices = async (id, services) => {
  return prisma.project.update({ where: { id }, data: { services } })
}

export const updateProject = async (id, data) => {
  return prisma.project.update({ where: { id }, data: { data } })
}

export const archiveProject = async (id) => {
  const project = await prisma.findUnique({ where: { id } })
  return prisma.project.update({
    where: { id },
    data: {
      name: `${project.name}_${Date.now()}_archived`,
      status: 'archived',
      locked: true,
    },
  })
}

// TECH
export const _initializeProject = async ({ id, name, organization, description, services, locked }) => {
  return prisma.project.create({ data: { id, name, organization, description, status: 'initializing', locked, services } })
}

export const _dropProjectsTable = async () => {
  await prisma.project.deleteMany({})
}
