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
  getOrganizationById,
  getProjectByNames,
  getProjectOrThrow,
  initializeProject,
  listProjects as listProjectsQuery,
  lockProject,
  updateProject as updateProjectQuery,
} from '@/resources/queries-index.js'
import { BadRequest400, Unprocessable422 } from '@/utils/errors.js'
import { whereBuilder } from '@/utils/controller.js'
import { hook } from '@/utils/hook-wrapper.js'
import type { UserDetails } from '@/types/index.js'
import prisma from '@/prisma.js'

const projectStatus = ProjectStatusSchema._def.values
export async function listProjects({ status, statusIn, statusNotIn, filter = 'member', ...query }: typeof projectContract.listProjects.query._type, userId: User['id'] | undefined) {
  return listProjectsQuery({
    ...query,
    status: whereBuilder({ enumValues: projectStatus, eqValue: status, inValues: statusIn, notInValues: statusNotIn }),
    filter,
    userId,
  }).then(projects => projects
    .map(({ clusters, ...project }) => ({
      ...project,
      clusterIds: clusters.map(({ id }) => id),
      roles: project.roles.map(role => ({ ...role, permissions: role.permissions.toString() })),
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
  const organization = await getOrganizationById(dataDto.organizationId)
  if (!organization) return new BadRequest400('Organisation introuvable')
  if (!organization.active) return new BadRequest400('Organisation inactive')

  const projectSearch = await getProjectByNames({ name: dataDto.name, organizationName: organization.name })
  if (projectSearch) {
    return new BadRequest400(`Le projet "${dataDto.name}" existe déjà`)
  }

  // Actions
  const project = await initializeProject({ ...dataDto, ownerId: requestor.id })

  const { results, project: projectInfos } = await hook.project.upsert(project.id)
  await addLogs({ action: 'Create Project', data: results, userId: requestor.id, requestId, projectId: project.id })
  if (results.failed) {
    return new Unprocessable422('Echec des services à la création du projet')
  }

  return {
    ...projectInfos,
    clusterIds: projectInfos.clusters.map(({ id }) => id),
    everyonePerms: projectInfos.everyonePerms.toString(),
    roles: projectInfos.roles.map(role => ({ ...role, permissions: role.permissions.toString() })),
  }
}

export async function getProject(projectId: Project['id']) {
  return getProjectOrThrow(projectId).then(({ clusters, ...project }) => ({
    ...project,
    clusterIds: clusters.map(({ id }) => id),
    roles: project.roles.map(role => ({ ...role, permissions: role.permissions.toString() })),
    everyonePerms: project.everyonePerms.toString(),
  }))
}
export async function updateProject(
  { description, ownerId: ownerIdCandidate, everyonePerms, locked }: typeof projectContract.updateProject.body._type,
  projectId: Project['id'],
  requestor: UserDetails,
  requestId: string,
) {
  if (typeof locked === 'string') {
    if (locked === 'true') {
      locked = true
    } else if (locked === 'false') {
      locked = false
    } else {
      locked = undefined
    }
  }
  // Actions
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { members: { include: { user: true } } },
  })

  if (ownerIdCandidate && ownerIdCandidate !== project.ownerId) {
    const memberCandidate = project.members.find(member => member.userId === ownerIdCandidate)
    if (!memberCandidate) {
      return new BadRequest400('Le nouveau propriétaire doit faire partie des membres actuels du projet')
    }
    if (memberCandidate.user.type !== 'human') return new BadRequest400('Seuls les comptes humains peuvent être propriétaire de projets')
    if (!project.members.find(member => member.userId === project.ownerId)) {
      await prisma.projectMembers.create({
        data: { userId: project.ownerId, projectId },
      })
    }
    await prisma.$transaction([
      prisma.projectMembers.delete({
        where: { projectId_userId: { userId: ownerIdCandidate, projectId } },
      }),
      prisma.project.update({ where: { id: projectId }, data: { ownerId: ownerIdCandidate } }),
    ])
  }

  if (description || everyonePerms || typeof locked !== 'undefined') {
    await updateProjectQuery(projectId, {
      description,
      locked,
      ...everyonePerms && { everyonePerms: BigInt(everyonePerms) },
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
    roles: projectInfos.roles.map(role => ({ ...role, permissions: role.permissions.toString() })),
  }
}

interface ReplayHooksArgs {
  projectId: Project['id']
  userId?: User['id']
  requestId: string
}
export async function replayHooks({ projectId, userId, requestId }: ReplayHooksArgs) {
  // Actions
  const { results } = await hook.project.upsert(projectId)
  await addLogs({ action: 'Replay hooks for Project', data: results, userId, requestId, projectId })
  if (results.failed) {
    return new Unprocessable422('Echec des services au reprovisionnement du projet')
  }
  return null
}

export async function archiveProject(projectId: Project['id'], requestor: UserDetails, requestId: string) {
  // Actions
  // Empty the project first
  const [projectDb, ..._] = await Promise.all([
    // get initial project state
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    deleteAllRepositoryForProject(projectId),
    deleteAllEnvironmentForProject(projectId),
  ])

  if (projectDb.locked) {
    await lockProject(projectId)
  }

  // -- début - Suppression projet --
  const { results, project, stage } = await hook.project.delete(projectId)
  const action: string = stage === 'upsert'
    ? 'Delete all project resources'
    : 'Archive Project'
  await addLogs({ action, data: results, userId: requestor.id, requestId, projectId })
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
