import prisma from '@/prisma.js'
import { dbKeysExcluded, exclude } from '../utils/queries-tools.js'
import type { Organization, Project, User, Role } from '@prisma/client'
import { AsyncReturnType } from '@/utils/controller.js'

type ProjectCreate = Partial<Pick<Project, 'status' | 'locked' | 'description' | 'services'>>
export const updateProject = async (id: Project['id'], data: ProjectCreate) => {
  return prisma.project.update({ where: { id }, data: { ...data } })
}

// SELECT
export const getAllProjects = async () => {
  return prisma.project.findMany({
    include: {
      roles: {
        select: {
          user: true,
        },
        where: {
          role: 'owner',
        },
      },
      organization: true,
    },
  })
}

export const getProjectUsers = async (projectId: Project['id']) => {
  const res = await prisma.user.findMany({
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

export const getUserProjects = async (user: User) => {
  const res = await prisma.project.findMany({
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
          clusters: true,
        },
      },
      repositories: true,
      roles: {
        include: {
          user: true,
        },
      },
      clusters: {
        where: {
          privacy: 'dedicated',
        },
        select: {
          id: true,
          label: true,
          privacy: true,
          clusterResources: true,
        },
      },
    },
  })
  const resWithKeysExcluded = exclude(res, dbKeysExcluded)

  return resWithKeysExcluded
}
export type DsoProject = AsyncReturnType<typeof getUserProjects>[0] & { services: any }

export const getProjectById = async (id: Project['id']) => {
  return prisma.project.findUnique({ where: { id } })
}

const baseProjectIncludes = {
  organization: true,
  roles: true,
  environments: true,
}
export const getProjectInfos = async (id: Project['id']) => {
  return prisma.project.findUnique({
    where: { id },
    include: baseProjectIncludes,
  })
}

export const getProjectInfosAndRepos = async (id: Project['id']) => {
  return prisma.project.findUnique({
    where: { id },
    include: {
      ...baseProjectIncludes,
      repositories: true,
    },
  })
}
export const getProjectByNames = async ({ name, organizationName }: { name: Project['name'], organizationName: Organization['name'] }) => {
  const res = await prisma.project.findMany({
    where: {
      name,
      organization: {
        name: organizationName,
      },
    },
  })
  return res
}

export const getProjectByOrganizationId = async (organizationId: Organization['id']) => {
  return prisma.project.findMany({
    where: {
      organizationId,
      status: {
        not: 'archived',
      },
    },
  })
}

// CREATE
export const initializeProject = async ({ name, organizationId, description = '', ownerId }: { name: Project['name'], organizationId: Organization['id'], description: Project['description'], ownerId: User['id'] }) => {
  return prisma.project.create({
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

export const addUserToProject = async ({ project, user, role }: { project: Project, user: User, role: Role['role'] }) => {
  return prisma.role.create({
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

export const removeUserFromProject = async ({ projectId, userId }: { projectId: Project['id'], userId: User['id'] }) => {
  return prisma.role.delete({
    where: {
      userId_projectId: {
        projectId,
        userId,
      },
    },
  })
}

export const updateProjectServices = async (id: Project['id'], services: Project['services']) => {
  return prisma.project.update({ where: { id }, data: { services } })
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
export const _initializeProject = async (data: Parameters<typeof prisma.project.upsert>[0]['create']) => {
  return prisma.project.upsert({ where: { id: data.id }, create: data, update: data })
}

export const _dropProjectsTable = async () => {
  await prisma.project.deleteMany({})
}
