import {
  Prisma,
  ProjectStatus,
  type Organization,
  type Project,
  type User,
} from '@prisma/client'
import { projectContract, XOR } from '@cpn-console/shared'
import prisma from '@/prisma.js'

type ProjectUpdate = Partial<Pick<Project, 'description' | 'ownerId' | 'everyonePerms'>>
export const updateProject = (id: Project['id'], data: ProjectUpdate) =>
  prisma.project.update({
    where: { id },
    data,
    include: { members: true },
  })

// SELECT
type FilterWhere = XOR<{
  userId?: User['id']
  filter: 'all'
}, {
    userId: User['id']
    filter: 'owned' | 'member'
  }>
type ListProjectWhere = Omit<(typeof projectContract.listProjects.query._type), 'status_in' | 'status_not_in' | 'status'> &
  Pick<Prisma.ProjectWhereInput, 'status'> &
  FilterWhere
export const listProjects = async ({
  organizationId,
  organizationName,
  description,
  locked,
  name,
  status,
  id,
  filter,
  userId,
}: ListProjectWhere) => {
  const where: Prisma.ProjectWhereInput = {
    id,
    organizationId,
    locked,
    name,
    status,
    ...description && { description: { contains: description } },
    ...organizationName && { organization: { name: organizationName } },
  }
  if (filter === 'owned') {
    where.ownerId = userId
  } else if (filter === 'member') {
    where.OR = [{
      members: { some: { userId } },
    }, {
      ownerId: userId,
    }]
  }

  return prisma.project.findMany({
    where,
    include: {
      clusters: { select: { id: true } },
      members: { include: { user: true } },
      roles: true,
      owner: true,
    },
  })
}

export const getProjectInfosByIdOrThrow = (projectId: Project['id']) =>
  prisma.project.findUniqueOrThrow({
    where: {
      id: projectId,
    },
    select: {
      name: true,
      members: { include: { user: true } },
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

export const getProjectMembers = (projectId: Project['id']) =>
  prisma.projectMembers.findMany({
    where: {
      projectId,
    },
    include: { user: true },
  })

export const getProjectById = (id: Project['id']) =>
  prisma.project.findUnique({ where: { id } })

export const baseProjectIncludes = {
  organization: true,
  members: { include: { user: true } },
  clusters: true,
  roles: true,
  owner: true,
} as const

export const getProjectInfos = (id: Project['id']) =>
  prisma.project.findUnique({
    where: { id },
    include: baseProjectIncludes,
  })

export const getProjectInfosOrThrow = (id: Project['id']) =>
  prisma.project.findUniqueOrThrow({
    where: { id },
    include: baseProjectIncludes,
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
  name: Project['name']
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
      owner: true,
    },
  })

export const getRolesByProjectId = (projectId: Project['id']) =>
  prisma.projectRole.findMany({
    where: { projectId },
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
    include: {
      organization: true,
      members: { include: { user: true } },
      clusters: { select: clusterInfosSelect },
      environments: {
        include: {
          quota: true,
          stage: true,
          cluster: {
            select: clusterInfosSelect,
          },
        },
      },
      repositories: true,
      plugins: {
        select: {
          key: true,
          pluginName: true,
          value: true,
        },
      },
      owner: true,
      roles: true,
    },
  })

// CREATE
type CreateProjectParams = {
  name: Project['name']
  organizationId: Organization['id']
  description?: Project['description']
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
      ownerId,
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
    include: baseProjectIncludes,
  })

export const updateProjectFailed = (id: Project['id']) =>
  prisma.project.update({
    where: { id }, data: { status: ProjectStatus.failed },
    include: baseProjectIncludes,
  })

export const addUserToProject = (
  { project, user }: { project: Project, user: User },
) =>
  prisma.projectMembers.create({
    data: {
      userId: user.id,
      projectId: project.id,
    },
  })

export const removeUserFromProject = (
  { projectId, userId }: { projectId: Project['id'], userId: User['id'] },
) =>
  prisma.projectMembers.delete({
    where: {
      projectId_userId: {
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
    include: baseProjectIncludes,
  })
}

// TECH
export const _initializeProject = (data: Parameters<typeof prisma.project.upsert>[0]['create']) =>
  prisma.project.upsert({ where: { id: data.id }, create: data, update: data })
