import type {
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
  if (locked != null) whereAnd.push({ locked })
  if (name) whereAnd.push({ name })
  if (status) whereAnd.push({ status })
  if (description) whereAnd.push({ description: { contains: description } })
  if (lastSuccessProvisionningVersion) {
    if (lastSuccessProvisionningVersion === 'outdated') whereAnd.push({ lastSuccessProvisionningVersion: { not: appVersion } })
    else if (lastSuccessProvisionningVersion === 'last') whereAnd.push({ lastSuccessProvisionningVersion: { equals: appVersion } })
    else whereAnd.push({ lastSuccessProvisionningVersion })
  }
  if (search) {
    whereAnd.push({ OR: [{
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
    include: {
      environments: true,
      clusters: { include: { zone: true } },
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

export function getSlugs(slugPrefix: string) {
  return prisma.project.findMany({
    where: {
      slug: { startsWith: slugPrefix },
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
      environments: {
        select: {
          name: true,
          stage: true,
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
  external: true,
  privacy: true,
  secretName: true,
  kubeconfig: true,
  clusterResources: true,
  cpu: true,
  gpu: true,
  memory: true,
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
      members: { include: { user: true }, where: { user: { type: 'human' } } },
      clusters: { select: clusterInfosSelect },
      environments: {
        include: {
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
  description?: Project['description']
  ownerId: User['id']
  slug: Project['slug']
  limitless: boolean
  hprodCpu: number
  hprodGpu: number
  hprodMemory: number
  prodCpu: number
  prodGpu: number
  prodMemory: number
}

export function initializeProject(params: CreateProjectParams) {
  return prisma.project.create({
    data: {
      description: params.description ?? '',
      status: ProjectStatus.created,
      locked: false,
      ...params,
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
