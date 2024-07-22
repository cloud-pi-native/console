import type { Project, User } from '@prisma/client'
import type { KeycloakPayload } from 'fastify-keycloak-adapter'
import {
  ProjectStatusSchema,
  projectContract,
  type CreateProjectBody,
  type UpdateProjectBody,
} from '@cpn-console/shared'
import { servicesInfos } from '@cpn-console/hooks'
import {
  addLogs,
  deleteAllEnvironmentForProject,
  deleteAllRepositoryForProject,
  getOrganizationById,
  getProjectByNames,
  getProjectInfosAndRepos,
  getProjectInfos as getProjectInfosQuery,
  getPublicClusters,
  initializeProject,
  listProjects as listProjectsQuery,
  lockProject,
  removeClusterFromProject,
  updateProject as updateProjectQuery,
  getAllProjectsDataForExport,
  unlockProject,
} from '@/resources/queries-index.js'
import { BadRequest400, NotFound404, Unprocessable422, whereBuilder } from '@/utils/controller.js'
import { hook } from '@/utils/hook-wrapper.js'
import { UserDetails } from '@/types/index.js'
import { json2csv } from 'json-2-csv'
import { logUser } from '../user/business.js'
import prisma from '@/prisma.js'

// Fetch infos
export const getProjectInfosAndClusters = async (projectId: string) => {
  const project = await getProjectInfosQuery(projectId)
  if (!project) return new NotFound404()
  const projectClusters = project.clusters ? [...await getPublicClusters(), ...project.clusters] : [...await getPublicClusters()]
  return { project, projectClusters }
}

const projectStatus = ProjectStatusSchema._def.values
export const listProjects = async (
  { status, statusIn, statusNotIn, filter = 'member', ...query }: typeof projectContract.listProjects.query._type,
  userId: User['id'],
) => listProjectsQuery({
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

export const getProjectSecrets = async (projectId: string, _userId: User['id']) => {
  const hookReply = await hook.project.getSecrets(projectId)
  if (hookReply.failed) {
    return new Unprocessable422('Echec des services à la récupération des secrets du projet')
  }

  return Object.fromEntries(
    Object.entries(hookReply.results)
      // @ts-ignore
      .filter(([_key, value]) => value.secrets)
      // @ts-ignore
      .map(([key, value]) => [servicesInfos[key]?.title, value.secrets]))
}

export const createProject = async (dataDto: CreateProjectBody, { groups, ...requestor }: UserDetails, requestId: string) => {
  // Pré-requis
  const owner = await logUser({ groups, ...requestor })
  const organization = await getOrganizationById(dataDto.organizationId)
  if (!organization) return new BadRequest400('Organisation introuvable')
  if (!organization.active) return new BadRequest400('Organisation inactive')

  const projectSearch = await getProjectByNames({ name: dataDto.name, organizationName: organization.name })
  if (projectSearch.length > 0) {
    return new BadRequest400(`Le projet "${dataDto.name}" existe déjà`)
  }

  // Actions
  const project = await initializeProject({ ...dataDto, ownerId: owner.id })

  const { results, project: projectInfos } = await hook.project.upsert(project.id)
  await addLogs('Create Project', results, owner.id, requestId)
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

export const updateProject = async ({ description, ownerId, everyonePerms }: UpdateProjectBody, projectId: Project['id'], requestor: UserDetails, requestId: string) => {
  // Actions
  const updatedProject = await updateProjectQuery(projectId, {
    description,
    ownerId,
    ...everyonePerms && { everyonePerms: BigInt(everyonePerms) },
  })

  if (ownerId) {
    if (!updatedProject.members.find(member => member.userId === ownerId)) return new BadRequest400('Le nouveau propriétaire doit faire partie des membres actuels du projet')
    await prisma.projectMembers.createMany({
      data: { userId: requestor.id, projectId },
      skipDuplicates: true,
    })
    await prisma.projectMembers.delete({
      where: { projectId_userId: { userId: updatedProject.ownerId, projectId } },
    })
  }

  const { results, project: projectInfos } = await hook.project.upsert(projectId)
  await addLogs('Update Project', results, requestor.id, requestId)
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

export const replayHooks = async (projectId: Project['id'], requestor: KeycloakPayload, requestId: string) => {
  // Pré-requis
  const project = await getProjectInfosQuery(projectId)
  if (!project || project.status === 'archived') return new NotFound404()

  // Actions
  const { results } = await hook.project.upsert(project.id)
  await addLogs('Replay hooks for Project', results, requestor.id, requestId)
  if (results.failed) {
    return new Unprocessable422('Echec des services au reprovisionnement du projet')
  }
  return null
}

export const archiveProject = async (projectId: Project['id'], requestor: KeycloakPayload, requestId: string) => {
  // Pré-requis
  const project = await getProjectInfosAndRepos(projectId)
  if (!project) return new NotFound404()

  // Actions
  // Empty the project first
  await Promise.all([
    lockProject(projectId),
    deleteAllRepositoryForProject(projectId),
    deleteAllEnvironmentForProject(projectId),
  ])

  const { results: upsertResults } = await hook.project.upsert(project.id)
  await addLogs('Delete all project resources', upsertResults, requestor.id, requestId)
  if (upsertResults.failed) {
    return new Unprocessable422('Echec des services à la suppression des ressources du projet')
  }

  // -- début - Suppression projet --
  const { results } = await hook.project.delete(project.id)
  await addLogs('Archive Project', results, requestor.id, requestId)
  if (results.failed) {
    return new Unprocessable422('Echec des services à la suppression du projet')
  }

  // -- début - Retrait clusters --
  for (const cluster of project.clusters) {
    await removeClusterFromProject(cluster.id, project.id)
  }
  // -- fin - Retrait clusters cibles --

  // -- fin - Suppression projet --
  return null
}

export const handleProjectLocking = async (projectId: Project['id'], lock: Project['locked']) => {
  if (lock) {
    await lockProject(projectId)
  } else {
    await unlockProject(projectId)
  }
  return null
}

export const generateProjectsData = async () => {
  const projects = await getAllProjectsDataForExport()

  return json2csv(projects, {
    emptyFieldValue: '',
  })
}
