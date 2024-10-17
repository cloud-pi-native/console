import type {
  Organization,
  Prisma,
  Project,
  User,
} from '@prisma/client'
import {
  ProjectStatus,
} from '@prisma/client'
import type { XOR, projectContract } from '@cpn-console/shared'
import prisma from '@/prisma.js'

type ProjectUpdate = Partial<Pick<Project, 'description' | 'ownerId' | 'everyonePerms' | 'locked'>>
export function updateProject(id: Project['id'], data: ProjectUpdate) {
  return prisma.project.update({
    where: { id },
    data,
    include: { members: true },
  })
}

// SELECT
type FilterWhere = XOR<{
  userId?: User['id']
  filter: 'all'
}, {
    userId: User['id'] | undefined
    filter: 'owned' | 'member'
  }>
type ListProjectWhere = Omit<(typeof projectContract.listProjects.query._type), 'status_in' | 'status_not_in' | 'status'> &
  Pick<Prisma.ProjectWhereInput, 'status'> &
  FilterWhere
export async function listProjects({
  organizationId,
  organizationName,
  description,
  locked,
  name,
  status,
  id,
  filter,
  userId,
}: ListProjectWhere) {
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

export function getProjectOrThrow(id: Project['id']) {
  return prisma.project.findUniqueOrThrow({
    where: { id },
    include: {
      clusters: { select: { id: true } },
      members: { include: { user: true } },
      roles: true,
      owner: true,
    },
  })
}

export function getProjectInfosByIdOrThrow(projectId: Project['id']) {
  return prisma.project.findUniqueOrThrow({
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
}

export function getProjectMembers(projectId: Project['id']) {
  return prisma.projectMembers.findMany({
    where: {
      projectId,
    },
    include: { user: true },
  })
}

export function getProjectById(id: Project['id']) {
  return prisma.project.findUnique({ where: { id } })
}

export const baseProjectIncludes = {
  organization: true,
  members: { include: { user: true } },
  clusters: true,
  roles: true,
  owner: true,
} as const

export function getProjectInfos(id: Project['id']) {
  return prisma.project.findUnique({
    where: { id },
    include: baseProjectIncludes,
  })
}

export function getProjectInfosOrThrow(id: Project['id']) {
  return prisma.project.findUniqueOrThrow({
    where: { id },
    include: baseProjectIncludes,
  })
}

export function getProjectInfosAndRepos(id: Project['id']) {
  return prisma.project.findUniqueOrThrow({
    where: { id },
    include: {
      ...baseProjectIncludes,
      repositories: true,
    },
  })
}

interface GetProjectByNameParams {
  name: Project['name']
  organizationName: Organization['name']
}

export function getProjectByNames({ name, organizationName }: GetProjectByNameParams) {
  return prisma.project.findFirst({
    where: {
      name,
      organization: { name: organizationName },
    },
  })
}

export function getProjectByOrganizationId(organizationId: Organization['id']) {
  return prisma.project.findMany({
    where: {
      organizationId,
      status: { not: ProjectStatus.archived },
    },
  })
}

export function getAllProjectsDataForExport() {
  return prisma.project.findMany({
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
}

export function getRolesByProjectId(projectId: Project['id']) {
  return prisma.projectRole.findMany({
    where: { projectId },
  })
}

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
      argocdUrl: true,
    },
  },
}
export function getHookProjectInfos(id: Project['id']) {
  return prisma.project.findUniqueOrThrow({
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
}

// CREATE
interface CreateProjectParams {
  name: Project['name']
  organizationId: Organization['id']
  description?: Project['description']
  ownerId: User['id']
}

export function initializeProject({ name, organizationId, description = '', ownerId }: CreateProjectParams) {
  return prisma.project.create({
    data: {
      name,
      organizationId,
      description,
      status: ProjectStatus.created,
      locked: false,
      ownerId,
    },
  })
}

// UPDATE
export function lockProject(id: Project['id']) {
  return prisma.project.update({
    where: { id },
    data: { locked: true },
  })
}

export function updateProjectCreated(id: Project['id']) {
  return prisma.project.update({
    where: { id },
    data: { status: ProjectStatus.created },
    include: baseProjectIncludes,
  })
}

export function updateProjectFailed(id: Project['id']) {
  return prisma.project.update({
    where: { id },
    data: { status: ProjectStatus.failed },
    include: baseProjectIncludes,
  })
}

export function updateProjectWarning(id: Project['id']) {
  return prisma.project.update({
    where: { id },
    data: { status: ProjectStatus.warning },
    include: baseProjectIncludes,
  })
}

export function addUserToProject({ project, user }: { project: Project, user: User }) {
  return prisma.projectMembers.create({
    data: {
      userId: user.id,
      projectId: project.id,
    },
  })
}

export function removeUserFromProject({ projectId, userId }: { projectId: Project['id'], userId: User['id'] }) {
  return prisma.projectMembers.delete({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  })
}

export async function archiveProject(id: Project['id']) {
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
export function _initializeProject(data: Parameters<typeof prisma.project.upsert>[0]['create']) {
  return prisma.project.upsert({ where: { id: data.id }, create: data, update: data })
}
