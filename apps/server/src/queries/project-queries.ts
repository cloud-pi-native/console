import prisma from '@/prisma.js'
import { dbKeysExcluded, exclude } from '../utils/queries-tools.js'
import { Organizations, Projects, Users, Roles } from '@prisma/client'

type ProjectCreate = Partial<Pick<Projects, 'status' | 'locked' | 'description' | 'services'>>
export const updateProject = async (id: Projects['id'], data: ProjectCreate) => {
  return prisma.projects.update({ where: { id }, data: { ...data } })
}

// SELECT
export const getAllProjects = async () => {
  return prisma.projects.findMany({
    include: {
      roles: {
        select: {
          user: true,
        },
        where: {
          role: 'owner',
        },
      },
    },
  })
}

export const getProjectUsers = async (projectId: Projects['id']) => {
  const res = await prisma.users.findMany({
    include: {
      roles: {
        where: {
          projectId,
        },
      },
    },
  })

  const resWithKeysExcluded = exclude(res, ['role'])
  return resWithKeysExcluded
}

export const getUserProjects = async (user: Users) => {
  const res = await prisma.projects.findMany({
    where: {
      roles: {
        some: {
          userId: user.id,
        },
      },
      status: {
        not: 'archived',
      },
    },
    orderBy: {
      name: 'asc',
    },
    include: {
      organization: true,
      environments: {
        include: {
          permissions: {
            include: {
              user: true,
            },
          },
        },
      },
      repositories: true,
      roles: {
        include: {
          user: true,
        },
      },
    },
  })
  const resWithKeysExcluded = exclude(res, dbKeysExcluded)

  return resWithKeysExcluded
}

export const getProjectById = async (id: Projects['id']) => {
  return prisma.projects.findUnique({ where: { id } })
}

const baseProjectIncludes = {
  organization: true,
  roles: true,
  environments: true,
}
export const getProjectInfos = async (id: Projects['id']) => {
  return prisma.projects.findUnique({
    where: { id },
    include: baseProjectIncludes,
  })
}

export const getProjectInfosAndRepos = async (id: Projects['id']) => {
  return prisma.projects.findUnique({
    where: { id },
    include: {
      ...baseProjectIncludes,
      repositories: true,
    },
  })
}
export const getProjectByNames = async ({ name, organizationName }: { name: Projects['name'], organizationName: Organizations['name'] }) => {
  const res = await prisma.projects.findMany({
    where: {
      name,
      organization: {
        name: organizationName,
      },
    },
  })
  return res
}

// CREATE
export const initializeProject = async ({ name, organizationId, description, ownerId }: { name: Projects['name'], organizationId: Organizations['id'], description: Projects['description'], ownerId: Users['id'] }) => {
  return prisma.projects.create({
    data: {
      name,
      organizationId,
      description,
      status: 'initializing',
      locked: true,
      services: {},
      roles: {
        create: {
          role: 'owner',
          userId: ownerId,
        },
      },
    },
  })
}

// UPDATE
export const lockProject = async (id: Projects['id']) => {
  return prisma.projects.update({ where: { id }, data: { locked: true } })
}

export const unlockProject = async (id: Projects['id']) => {
  return prisma.projects.update({ where: { id }, data: { locked: false } })
}

export const updateProjectCreated = async (id: Projects['id']) => {
  return prisma.projects.update({ where: { id }, data: { status: 'created' } })
}

export const updateProjectFailed = async (id: Projects['id']) => {
  return prisma.projects.update({ where: { id }, data: { status: 'failed' } })
}

export const addUserToProject = async ({ project, user, role }: { project: Projects, user: Users, role: Roles['role'] }) => {
  return prisma.roles.create({
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

// TODO Prisma
export const removeUserFromProject = async ({ projectId, userId }: { projectId: Projects['id'], userId: Users['id'] }) => {
  return prisma.roles.delete({
    where: {
      userId_projectId: {
        projectId,
        userId,
      },
    },
  })
}

export const updateProjectServices = async (id: Projects['id'], services: Projects['services']) => {
  return prisma.projects.update({ where: { id }, data: { services } })
}

export const archiveProject = async (id: Projects['id']) => {
  const project = await prisma.projects.findUnique({ where: { id } })
  return prisma.projects.update({
    where: { id },
    data: {
      name: `${project.name}_${Date.now()}_archived`,
      status: 'archived',
      locked: true,
    },
  })
}

// TECH
export const _initializeProject = async ({ id, name, organizationId, description, services, locked }: { id: Projects['id'], name: Projects['name'], organizationId: Organizations['id'], description: Projects['description'], services: Projects['services'], locked: Projects['locked'] }) => {
  return prisma.projects.create({ data: { id, name, organizationId, description, status: 'initializing', locked, services } })
}

export const _dropProjectsTable = async () => {
  await prisma.projects.deleteMany({})
}
