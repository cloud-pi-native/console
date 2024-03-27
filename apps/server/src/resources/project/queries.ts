import { ProjectStatus, type Organization, type Project, type Role, type User } from '@prisma/client'
import { ClusterPrivacy, type AsyncReturnType } from '@cpn-console/shared'
import prisma from '@/prisma.js'

type ProjectUpdate = Partial<Pick<Project, 'description'>>
export const updateProject = async (id: Project['id'], data: ProjectUpdate) => {
  return prisma.project.update({ where: { id }, data: { ...data } })
}

// SELECT
export const getAllProjects = async () => {
  return prisma.project.findMany({
    include: {
      roles: {
        include: {
          user: true,
        },
      },
      organization: true,
      environments: {
        include: {
          quotaStage: {
            select: {
              quota: {
                select: {
                  id: true,
                  name: true,
                },
              },
              stage: {
                select: {
                  id: true,
                  name: true,
                  quotaStage: {
                    select: {
                      id: true,
                      quotaId: true,
                      stageId: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      repositories: true,
    },
  })
}

export const getProjectUsers = async (projectId: Project['id']) => {
  const res = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          projectId,
        },
      },
    },
  })
  return res
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
        not: ProjectStatus.archived,
      },
    },
    orderBy: {
      name: 'asc',
    },
    include: {
      organization: true,
      environments: {
        include: {
          permissions: true,
          quotaStage: true,
        },
      },
      repositories: true,
      roles: true,
      clusters: {
        where: {
          privacy: ClusterPrivacy.DEDICATED,
        },
        select: {
          id: true,
          label: true,
          privacy: true,
          clusterResources: true,
          infos: true,
        },
      },
    },
  })
  return res
}

export type DsoProject = AsyncReturnType<typeof getUserProjects>[0] & { services: any }

export const getProjectById = async (id: Project['id']) => {
  return prisma.project.findUnique({ where: { id } })
}

const baseProjectIncludes = {
  organization: true,
  roles: true,
  environments: { include: { permissions: true } },
  clusters: true,
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
        not: ProjectStatus.archived,
      },
    },
  })
}

export const getAllProjectsDataForExport = async () => {
  return prisma.project.findMany({
    select: {
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: {
          label: true,
        },
      },
      environments: {
        select: {
          name: true,
          quotaStage: {
            select: {
              quota: {
                select: {
                  name: true,
                },
              },
              stage: {
                select: {
                  name: true,
                },
              },
            },
          },
          cluster: {
            select: {
              label: true,
            },
          },
        },
      },
      roles: {
        select: {
          role: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  })
}

export const getRolesByProjectId = async (projectId: Project['id']) => {
  return prisma.role.findMany({
    where: {
      projectId,
    },
    include: {
      user: true,
    },
  })
}

export const getHookProjectInfos = async (id: Project['id']) => await prisma.project.findUniqueOrThrow({
  where: {
    id,
  },
  select: {
    id: true,
    name: true,
    status: true,
    description: true,
    organization: {
      select: {
        id: true,
        label: true,
        name: true,
      },
    },
    roles: {
      select: {
        user: true,
        role: true,
        userId: true,
      },
    },
    clusters: {
      select: {
        id: true,
        infos: true,
        label: true,
        privacy: true,
        secretName: true,
        kubeconfig: true,
        clusterResources: true,
      },
    },
    environments: {
      include: {
        permissions: true,
        quotaStage: {
          include: {
            quota: true,
            stage: true,
          },
        },
      },
    },
    repositories: {
      select: {
        id: true,
        externalRepoUrl: true,
        isInfra: true,
        isPrivate: true,
        internalRepoName: true,
      },
    },
  },
})

// CREATE
export const initializeProject = async ({ name, organizationId, description = '', ownerId }: { name: Project['name'], organizationId: Organization['id'], description?: Project['description'], ownerId: User['id'] }) => {
  return prisma.project.create({
    data: {
      name,
      organizationId,
      description,
      status: ProjectStatus.created,
      locked: false,
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
  return prisma.project.update({ where: { id }, data: { status: ProjectStatus.created } })
}

export const updateProjectFailed = async (id: Project['id']) => {
  return prisma.project.update({ where: { id }, data: { status: ProjectStatus.failed } })
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
  // @ts-ignore
  return prisma.project.update({ where: { id }, data: { services } })
}

export const archiveProject = async (id: Project['id']) => {
  const project = await prisma.project.findUnique({ where: { id } })
  return prisma.project.update({
    where: { id },
    data: {
      name: `${project?.name}_${Date.now()}_archived`,
      status: ProjectStatus.archived,
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
