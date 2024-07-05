import {
  ProjectStatus,
  type Organization,
  type Project,
  type Role,
  type User,
} from '@prisma/client'
import { ClusterPrivacy, type AsyncReturnType } from '@cpn-console/shared'
import prisma from '@/prisma.js'

type ProjectUpdate = Partial<Pick<Project, 'description'>>
export const updateProject = (id: Project['id'], data: ProjectUpdate) =>
  prisma.project.update({
    where: { id },
    data,
  })

// SELECT
export const getAllProjects = async () =>
  prisma.project.findMany({
    include: {
      roles: {
        include: {
          user: true,
        },
      },
    },
  })

export const getProjectInfosById = (projectId: Project['id']) =>
  prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      name: true,
      roles: {
        select: { userId: true },
      },
      organization: {
        select: { name: true },
      },
      environments: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          clusterId: true,
          stageId: true,
          quotaId: true,
        },
      },
      clusters: {
        where: { privacy: ClusterPrivacy.DEDICATED },
        select: {
          id: true,
          label: true,
          privacy: true,
          clusterResources: true,
          infos: true,
          zone: true,
        },
      },
    },
  })

export const getProjectUsers = (projectId: Project['id']) =>
  prisma.user.findMany({
    where: {
      roles: {
        some: {
          projectId,
        },
      },
    },
  })

export const getUserProjects = (userId: User['id']) =>
  prisma.project.findMany({
    where: {
      roles: {
        some: {
          userId,
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
          zoneId: true,
        },
      },
    },
  })

export type DsoProject = AsyncReturnType<typeof getUserProjects>[0] & { services: any }

export const getProjectById = (id: Project['id']) =>
  prisma.project.findUnique({ where: { id } })

const baseProjectIncludes: Parameters<typeof prisma.project.findUnique>[0]['include'] = {
  organization: true,
  roles: true,
  environments: {
    include: {
      permissions: true,
      stage: true,
      quota: true,
    },
  },
  clusters: true,
}
export const getProjectInfos = (id: Project['id']) =>
  prisma.project.findUnique({
    where: { id },
    include: baseProjectIncludes,
  })

export const getProjectInfosOrThrow = (id: Project['id']) =>
  prisma.project.findUniqueOrThrow({
    where: { id },
    include: {
      organization: true,
      roles: true,
      environments: { include: { permissions: true, stage: true, quota: true } },
      clusters: true,
      repositories: true,
    },
  })

export const getProjectInfosAndRepos = (id: Project['id']) =>
  prisma.project.findUnique({
    where: { id },
    include: {
      ...baseProjectIncludes,
      repositories: true,
    },
  })

type GetProjectByNameParams = {
  name: Project['name'],
  organizationName: Organization['name']
}

export const getProjectByNames = ({ name, organizationName }: GetProjectByNameParams) =>
  prisma.project.findMany({
    where: {
      name,
      organization: { name: organizationName },
    },
  })

export const getProjectByOrganizationId = (organizationId: Organization['id']) =>
  prisma.project.findMany({
    where: {
      organizationId,
      status: { not: ProjectStatus.archived },
    },
  })

export const getAllProjectsDataForExport = () =>
  prisma.project.findMany({
    select: {
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: { label: true },
      },
      environments: {
        select: {
          name: true,
          stage: true,
          quota: true,
          cluster: {
            select: { label: true },
          },
        },
      },
      roles: {
        select: {
          role: true,
          user: {
            select: { email: true },
          },
        },
      },
    },
  })

export const getRolesByProjectId = (projectId: Project['id']) =>
  prisma.role.findMany({
    where: { projectId },
    include: { user: true },
  })

const clusterInfosSelect = {
  id: true,
  infos: true,
  label: true,
  privacy: true,
  secretName: true,
  kubeconfig: true,
  clusterResources: true,
  zone: {
    select: {
      id: true,
      slug: true,
    },
  },
}
export const getHookProjectInfos = (id: Project['id']) =>
  prisma.project.findUniqueOrThrow({
    where: { id },
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
        select: clusterInfosSelect,
      },
      environments: {
        include: {
          permissions: true,
          quota: true,
          stage: true,
          cluster: { select: clusterInfosSelect },
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
      projectPlugin: {
        select: {
          key: true,
          pluginName: true,
          value: true,
        },
      },
    },
  })

// CREATE
type CreateProjectParams = {
  name: Project['name'],
  organizationId: Organization['id'],
  description?: Project['description'],
  ownerId: User['id']
}

export const initializeProject = (
  { name, organizationId, description = '', ownerId }: CreateProjectParams,
) =>
  prisma.project.create({
    data: {
      name,
      organizationId,
      description,
      status: ProjectStatus.created,
      locked: false,
      roles: {
        create: {
          role: 'owner',
          userId: ownerId,
        },
      },
    },
  })

// UPDATE
export const lockProject = (id: Project['id']) =>
  prisma.project.update({
    where: { id }, data: { locked: true },
  })

export const unlockProject = (id: Project['id']) =>
  prisma.project.update({
    where: { id }, data: { locked: false },
  })

export const updateProjectCreated = (id: Project['id']) =>
  prisma.project.update({
    where: { id }, data: { status: ProjectStatus.created },
  })

export const updateProjectFailed = (id: Project['id']) =>
  prisma.project.update({
    where: { id }, data: { status: ProjectStatus.failed },
  })

export const addUserToProject = (
  { project, user, role }: { project: Project, user: User, role: Role['role'] },
) =>
  prisma.role.create({
    data: {
      user: {
        connect: { id: user.id },
      },
      role,
      project: {
        connect: {
          id: project.id,
        },
      },
    },
  })

export const removeUserFromProject = (
  { projectId, userId }: { projectId: Project['id'], userId: User['id'] },
) =>
  prisma.role.delete({
    where: {
      userId_projectId: {
        projectId,
        userId,
      },
    },
  })

export const archiveProject = async (id: Project['id']) => {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { name: true },
  })
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
export const _initializeProject = (data: Parameters<typeof prisma.project.upsert>[0]['create']) =>
  prisma.project.upsert({ where: { id: data.id }, create: data, update: data })

export const _dropProjectsTable = prisma.project.deleteMany
