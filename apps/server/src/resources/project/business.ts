import { json2csv } from 'json-2-csv'
import { servicesInfos } from '@cpn-console/hooks'
import type { Project, User } from '@prisma/client'
import type { projectContract } from '@cpn-console/shared'
import { ProjectStatusSchema } from '@cpn-console/shared'
import {
  addLogs,
  deleteAllEnvironmentForProject,
  deleteAllRepositoryForProject,
  getAllProjectsDataForExport,
  getProjectOrThrow,
  getSlugs,
  initializeProject,
  listProjects as listProjectsQuery,
  lockProject,
  updateProject as updateProjectQuery,
} from '@/resources/queries-index.js'
import type { ErrorResType } from '@/utils/errors.js'
import { BadRequest400, Forbidden403, Unprocessable422 } from '@/utils/errors.js'
import { whereBuilder } from '@/utils/controller.js'
import { hook } from '@/utils/hook-wrapper.js'
import type { UserDetails } from '@/types/index.js'
import prisma from '@/prisma.js'
import { parallelBulkLimit } from '@/utils/env.js'

export function generateSlug(prefix: string, existingSlugs?: string[]) {
  if (!existingSlugs?.includes(prefix)) {
    return prefix
  }
  let idx = 1
  let generated = `${prefix}-${idx}`
  while (existingSlugs.includes(generated)) {
    idx++
    generated = `${prefix}-${idx}`
  }
  return generated
}

const projectStatus = ProjectStatusSchema._def.values
export async function listProjects({ status, statusIn, statusNotIn, filter = 'member', ...query }: typeof projectContract.listProjects.query._type, userId: User['id'] | undefined) {
  return listProjectsQuery({
    ...query,
    status: whereBuilder({ enumValues: projectStatus, eqValue: status, inValues: statusIn, notInValues: statusNotIn }),
    filter,
    userId,
  }).then(projects => projects.map(({ clusters, ...project }) => ({
    ...project,
    clusterIds: clusters.map(({ id }) => id),
    roles: project.roles.map(role => ({ ...role, permissions: role.permissions.toString(), oidcGroup: project.slug ? role.oidcGroup?.replace(`/${project.slug}/console`, '') : role.oidcGroup })),
    everyonePerms: project.everyonePerms.toString(),
  })))
}

export async function getProjectSecrets(projectId: string) {
  const hookReply = await hook.project.getSecrets(projectId)
  if (hookReply.failed) {
    return new Unprocessable422('Echec des services à la récupération des secrets du projet')
  }

  return Object.fromEntries(
    Object.entries(hookReply.results)
      // @ts-ignore
      .filter(([_key, value]) => Object.keys(value.secrets).length)
      // @ts-ignore
      .map(([key, value]) => [servicesInfos[key]?.title, value.secrets]),
  )
}

export async function createProject(dataDto: typeof projectContract.createProject.body._type, requestor: UserDetails, requestId: string) {
  if (requestor.type !== 'human') return new BadRequest400('Seuls les comptes humains peuvent créer des projets')

  let slug = dataDto.name
  const projectsWithSamePrefix = await getSlugs(slug)
  slug = generateSlug(slug, projectsWithSamePrefix?.map(project => project.slug))

  // Actions
  const project = await initializeProject({ ...dataDto, slug, ownerId: requestor.id })

  const { results, project: projectInfos } = await hook.project.upsert(project.id)
  await addLogs({ action: 'Create Project', data: results, userId: requestor.id, requestId, projectId: project.id })
  if (results.failed) {
    return new Unprocessable422('Echec des services à la création du projet')
  }

  for (const role of projectInfos.roles) {
    const roleResult = await hook.projectRole.upsert(role.id)
    await addLogs({ action: 'Upsert Project Role', data: roleResult.results, userId: requestor.id, requestId, projectId: project.id })
  }

  return {
    ...projectInfos,
    clusterIds: projectInfos.clusters.map(({ id }) => id),
    everyonePerms: projectInfos.everyonePerms.toString(),
    roles: projectInfos.roles.map(role => ({ ...role, permissions: role.permissions.toString(), oidcGroup: projectInfos.slug ? role.oidcGroup?.replace(`/${project.slug}/console`, '') : role.oidcGroup })),
  }
}

export async function getProject(projectId: Project['id']) {
  return getProjectOrThrow(projectId).then(({ clusters, ...project }) => ({
    ...project,
    clusterIds: clusters.map(({ id }) => id),
    roles: project.roles.map(role => ({ ...role, permissions: role.permissions.toString(), oidcGroup: project.slug ? role.oidcGroup?.replace(`/${project.slug}/console`, '') : role.oidcGroup })),
    everyonePerms: project.everyonePerms.toString(),
  }))
}

export async function updateProject(
  { description, ownerId: ownerIdCandidate, everyonePerms, locked, ...data }: typeof projectContract.updateProject.body._type,
  projectId: Project['id'],
  requestor: UserDetails,
  requestId: string,
) {
  // Actions
  const projectDb = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { members: { include: { user: true } } },
  })

  if (projectDb.status === 'archived') return new Forbidden403('Le projet est archivé')

  if (ownerIdCandidate && ownerIdCandidate !== projectDb.ownerId) {
    const memberCandidate = projectDb.members.find(member => member.userId === ownerIdCandidate)
    if (!memberCandidate) {
      return new BadRequest400('Le nouveau propriétaire doit faire partie des membres actuels du projet')
    }
    if (memberCandidate.user.type !== 'human') return new BadRequest400('Seuls les comptes humains peuvent être propriétaire de projets')
    if (!projectDb.members.find(member => member.userId === projectDb.ownerId)) {
      await prisma.projectMembers.create({
        data: { userId: projectDb.ownerId, projectId },
      })
    }
    await prisma.$transaction([
      prisma.projectMembers.delete({
        where: { projectId_userId: { userId: ownerIdCandidate, projectId } },
      }),
      prisma.project.update({ where: { id: projectId }, data: { ownerId: ownerIdCandidate } }),
    ])
  }

  if (typeof description !== 'undefined' || typeof everyonePerms !== 'undefined' || typeof locked !== 'undefined') {
    await updateProjectQuery(projectId, {
      description,
      locked,
      ...everyonePerms && { everyonePerms: BigInt(everyonePerms) },
      ...data,
    })
  }

  const { results, project: projectInfos } = await hook.project.upsert(projectId)
  await addLogs({ action: 'Update Project', data: results, userId: requestor.id, requestId, projectId: projectInfos.id })
  if (results.failed) {
    return new Unprocessable422('Echec des services à la mise à jour du projet')
  }

  return {
    ...projectInfos,
    clusterIds: projectInfos.clusters.map(({ id }) => id),
    everyonePerms: projectInfos.everyonePerms.toString(),
    roles: projectInfos.roles.map(role => ({ ...role, permissions: role.permissions.toString(), oidcGroup: projectInfos.slug ? role.oidcGroup?.replace(`/${projectInfos.slug}/console`, '') : role.oidcGroup })),
  }
}

interface ReplayHooksArgs {
  projectId: Project['id']
  userId?: User['id']
  requestId: string
}
export async function replayHooks({ projectId, userId, requestId }: ReplayHooksArgs): Promise<ErrorResType | null> {
  const projectDb = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { members: { include: { user: true } } },
  })
  if (projectDb.locked) return new Forbidden403('Le projet est verrouillé')
  if (projectDb.status === 'archived') return new Forbidden403('Le projet est archivé')
  // Actions
  const { results } = await hook.project.upsert(projectId)
  await addLogs({ action: 'Replay hooks for Project', data: results, userId, requestId, projectId })
  if (results.failed) {
    return new Unprocessable422('Echec des services au reprovisionnement du projet')
  }
  return null
}

export async function archiveProject(projectId: Project['id'], requestor: UserDetails, requestId: string): Promise<ErrorResType | null> {
  // Actions
  // Empty the project first
  const [projectDb, ..._] = await Promise.all([
    // get initial project state
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    deleteAllRepositoryForProject(projectId),
    deleteAllEnvironmentForProject(projectId),
  ])

  if (projectDb.locked) return new Forbidden403('Le projet est verrouillé')
  if (projectDb.status === 'archived') return new BadRequest400('Le projet est archivé')
  if (projectDb.locked) {
    await lockProject(projectId)
  }

  // -- début - Suppression projet --
  const { results, project } = await hook.project.delete(projectId)
  await addLogs({ action: 'Delete all project resources', data: results, userId: requestor.id, requestId, projectId })
  if (project.status !== 'archived' && !projectDb.locked) {
    await prisma.project.update({ where: { id: projectId }, data: { locked: false } })
  }
  if (results.failed) {
    return new Unprocessable422('Echec des services à la suppression du projet')
  }

  // Retrait clusters --
  await prisma.project.update({
    where: { id: projectId },
    data: {
      clusters: { set: [] },
    },
  })

  // -- fin - Suppression projet --
  return null
}

export async function generateProjectsData() {
  const projects = await getAllProjectsDataForExport()

  return json2csv(projects, {
    emptyFieldValue: '',
  })
}

export async function bulkActionProject(data: typeof projectContract.bulkActionProject.body._type, requestor: UserDetails, requestId: string) {
  if (data.projectIds === 'all') {
    data.projectIds = (await prisma.project.findMany({
      select: { id: true },
      where: { status: { not: 'archived' } },
    })).map(({ id }) => id)
  }
  bulkExector(data.projectIds
    .map((projectId) => {
      if (data.action === 'archive') {
        return () => archiveProject(projectId, requestor, requestId)
      }
      if (data.action === 'lock') {
        return () => updateProject({ locked: true }, projectId, requestor, requestId)
      }
      if (data.action === 'unlock') {
        return () => updateProject({ locked: false }, projectId, requestor, requestId)
      }
      if (data.action === 'replay') {
        return () => replayHooks({ projectId, userId: requestor.id, requestId })
      }
      // should never been called
      return async () => {}
    }))
}

export function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size))
}

async function bulkExector(toExecute: Array<() => Promise<any>>) {
  const toExecuteChunked = chunk(toExecute, parallelBulkLimit)
  for (const chunkToExecute of toExecuteChunked) {
    await Promise.allSettled(chunkToExecute.map(fn => fn()))
  }
}
