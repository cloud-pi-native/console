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
import { appVersion } from '@/utils/env.js'
import { uuid } from '@/utils/queries-tools.js'

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
  search,
  lastSuccessProvisionningVersion,
}: ListProjectWhere) {
  const whereAnd: Prisma.ProjectWhereInput[] = []
  if (id) whereAnd.push({ id })
  if (organizationId) whereAnd.push({ organizationId })
  if (locked) whereAnd.push({ locked })
  if (name) whereAnd.push({ name })
  if (status) whereAnd.push({ status })
  if (description) whereAnd.push({ description: { contains: description } })
  if (organizationName) whereAnd.push({ organization: { name: organizationName } })
  if (lastSuccessProvisionningVersion) {
    if (lastSuccessProvisionningVersion === 'outdated') whereAnd.push({ lastSuccessProvisionningVersion: { not: appVersion } })
    else if (lastSuccessProvisionningVersion === 'last') whereAnd.push({ lastSuccessProvisionningVersion: { equals: appVersion } })
    else whereAnd.push({ lastSuccessProvisionningVersion })
  }
  if (search) {
    whereAnd.push({ OR: [{
      organization: { label: { contains: search } },
    }, {
      organization: { name: { contains: search } },
    }, {
      name: { contains: search },
    }, {
      owner: { email: { contains: search } },
    }] })
  }

  if (filter === 'owned') {
    whereAnd.push({ ownerId: userId })
  } else if (filter === 'member') {
    whereAnd.push({ OR: [{
      members: { some: { userId } },
    }, {
      ownerId: userId,
    }] })
  }

  return prisma.project.findMany({
    where: { AND: whereAnd },
    include: {
      clusters: { select: { id: true } },
      members: { include: { user: true } },
      roles: true,
      owner: true,
    },
  })
}

export function getProjectOrThrow(id: Project['id'] | Project['slug']) {
  return prisma.project.findFirstOrThrow({
    where: uuid.test(id)
      ? { id }
      : { slug: id },
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
      slug: true,
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

export function getSlugs(slugPrefix: string) {
  return prisma.project.findMany({
    where: {
      slug: { startsWith: slugPrefix },
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
      members: { include: { user: true }, where: { user: { type: 'human' } } },
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
  slug: Project['slug']
}

export function initializeProject({ slug, name, organizationId, description = '', ownerId }: CreateProjectParams) {
  return prisma.project.create({
    data: {
      slug,
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
    data: {
      status: ProjectStatus.created,
      lastSuccessProvisionningVersion: appVersion,
    },
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
    select: { name: true, slug: true },
  })
  return prisma.project.update({
    where: { id },
    data: {
      name: `${project?.name}_${Date.now()}_archived`,
      slug: `${project?.slug}_${Date.now()}_archived`,
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
