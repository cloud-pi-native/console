import prisma from '../../prisma'
import { dbKeysExcluded, exclude } from '../../utils/queries-tools.js'
import { Organization, Project, User, UsersProjects } from '@prisma/client'

// SELECT
export const getAllProjects = async () => {
  return prisma.project.findMany()
}

export const getProjectUsers = async (projectId: Project['id']) => {
  const res = await prisma.user.findMany({
    include: {
      UsersProjects: {
        where: {
          ProjectId: projectId,
        },
      },
    },
  })

  const resWithKeysExcluded = exclude(res, ['role'])
  return resWithKeysExcluded
}

export const getUserProjects = async (user: User) => {
  const res = await prisma.project.findMany({
    orderBy: {
      name: 'asc',
    },
    include: {
      organizationReference: true,
      repositories: true,
      UsersProjects: {
        where: {
          UserId: user.id,
        },
      },
      environments: {
        select: {
          permissions: {
            select: {
              user: true,
            },
          },
        },
      },
    },
  })
  const resWithKeysExcluded = exclude(res, dbKeysExcluded)
  return resWithKeysExcluded
}

export const getProjectById = async (id: Project['id']) => {
  return prisma.project.findUnique({ where: { id } })
}

export const getProject = async ({ name, organization }: { name: Project['name'], organization: Organization['id'] }) => {
  const res = await prisma.project.findFirst({ where: { name, organization } })
  return res
}

// CREATE
export const initializeProject = async ({ name, organization, description }: { name: Project['name'], organization: Organization['id'], description: Project['description'] }) => {
  return prisma.project.create({
    data: {
      name,
      organizationReference: {
        connect: {
          id: organization,
        },
      },
      description,
      status: 'initializing',
      locked: true,
      services: {},
    },
  })
}

// UPDATE
export const lockProject = async (id: Project['id']) => {
  return prisma.project.update({ where: { id }, data: { locked: true } })
}

export const unlockProject = async (id: Project['id']) => {
  return prisma.project.update({ where: { id }, data: { locked: false } })
}

export const updateProjectCreated = async (id: Project['id']) => {
  return prisma.project.update({ where: { id }, data: { status: 'created' } })
}

export const updateProjectFailed = async (id: Project['id']) => {
  return prisma.project.update({ where: { id }, data: { status: 'failed' } })
}

export const addUserToProject = async ({ project, user, role }: { project: Project, user: User, role: UsersProjects['role'] }) => {
  return prisma.usersProjects.create({
    data: {
      user: {
        connect: {
          id: user.id,
        },
      },
      role,
      project: {
        connect: {
          id: project.id,
        },
      },
    },
  })
}

export const removeUserFromProject = async ({ project, user }: { project: Project, user: User }) => {
  return prisma.usersProjects.deleteMany({
    where: {
      ProjectId: project.id,
      UserId: user.id,
    },
  })
}

export const updateProjectServices = async (id: Project['id'], services: Project['services']) => {
  return prisma.project.update({ where: { id }, data: { services } })
}

type ProjectCreate = Partial<Pick<Project, 'status' | 'locked' | 'description' | 'services'>>
export const updateProject = async (id: Project['id'], data: ProjectCreate) => {
  return prisma.project.update({ where: { id }, data: { ...data } })
}

export const archiveProject = async (id: Project['id']) => {
  const project = await prisma.project.findUnique({ where: { id } })
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
export const _initializeProject = async ({ id, name, organization, description, services, locked }: { id: Project['id'], name: Project['name'], organization: Organization['id'], description: Project['description'], services: Project['services'], locked: Project['locked'] }) => {
  return prisma.project.create({ data: { id, name, organization, description, status: 'initializing', locked, services } })
}

export const _dropProjectsTable = async () => {
  await prisma.project.deleteMany({})
}
