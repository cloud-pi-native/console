import type { Organization, Project, Role, User } from '@prisma/client'
import type { KeycloakPayload } from 'fastify-keycloak-adapter'
import {
  ProjectStatusSchema,
  ProjectSchemaV2,
  adminGroupPath,
  exclude,
  projectContract,
  projectIsLockedInfo,
  type AsyncReturnType,
  type CreateProjectBody,
  type UpdateProjectBody,
} from '@cpn-console/shared'
import { servicesInfos } from '@cpn-console/hooks'
import {
  addLogs,
  deleteAllEnvironmentForProject,
  deleteAllRepositoryForProject,
  deleteAllRoleNonOwnerForProject,
  getOrganizationById,
  getProjectByNames,
  getProjectInfosAndRepos,
  getProjectInfos as getProjectInfosQuery,
  getProjectInfosOrThrow as getProjectInfosOrThrowQuery,
  getPublicClusters,
  getUserProjects as getUserProjectsQuery,
  initializeProject,
  listProjects as listProjectsQuery,
  lockProject,
  removeClusterFromProject,
  updateProject as updateProjectQuery,
  getOrCreateUser,
  getAllProjectsDataForExport,
  unlockProject,
} from '@/resources/queries-index.js'
import { type UserDto } from '@/resources/user/business.js'
import { validateSchema } from '@/utils/business.js'
import { checkInsufficientPermissionInEnvironment, checkInsufficientRoleInProject, hasGroupAdmin, whereBuilder } from '@/utils/controller.js'
import { BadRequestError, DsoError, ForbiddenError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'
import { filterObjectByKeys } from '@/utils/queries-tools.js'
import { UserDetails } from '@/types/index.js'
import { json2csv } from 'json-2-csv'

export const rolesToMembers = (roles: (Role & { user: User })[]) => roles.map(({ role, user: { id, ...user } }) => ({ ...user, userId: id, role }))

// Fetch infos
export const getProjectInfosAndClusters = async (projectId: string) => {
  const project = await getProjectInfosQuery(projectId)
  if (!project) throw new NotFoundError('Projet introuvable')
  const projectClusters = project.clusters ? [...await getPublicClusters(), ...project.clusters] : [...await getPublicClusters()]
  return { project, projectClusters }
}

export const getUserProjects = async (userId: User['id']) => {
  const projects = await getUserProjectsQuery(userId)
  const publicClusterIds = (await getPublicClusters()).map(({ id }) => id)
  return projects.map(({ description, clusters, ...project }) => {
    const projectClusterIds = clusters.map(({ id }) => id)
    return {
      clusterIds: publicClusterIds.concat(projectClusterIds),
      description: description || '',
      ...project,
    }
  })
}

const projectStatus = ProjectStatusSchema._def.values
export const listProjects = async ({ status, statusIn, statusNotIn, filter = 'member', ...query }: typeof projectContract.listProjects.query._type, user: UserDetails) => {
  const isAdmin = hasGroupAdmin(user.groups)
  if (!isAdmin && filter === 'all') {
    filter = 'member'
  }

  return listProjectsQuery({
    ...query,
    status: whereBuilder({ enumValues: projectStatus, eqValue: status, inValues: statusIn, notInValues: statusNotIn }),
    filter,
    userId: user.id,
  }).then(projects => projects
    .map(({ clusters, roles, ...project }) => ({
      ...project,
      description: project.description ?? '',
      clusterIds: clusters.map(({ id }) => id),
      members: rolesToMembers(roles),
    })))
}

// Check logic
export const checkCreateProject = async (
  organizationName: Organization['name'],
  data: CreateProjectBody,
) => {
  const schemaValidation = ProjectSchemaV2.pick({ name: true, organizationId: true, description: true }).safeParse(data)
  validateSchema(schemaValidation)

  const projectSearch = await getProjectByNames({ name: data.name, organizationName })
  if (projectSearch.length > 0) {
    throw new BadRequestError(`Le projet "${data.name}" existe déjà`, { extras: {}, description: `Le projet "${data.name}" existe déjà` })
  }
}

const filterProject = (
  userId: User['id'],
  project: AsyncReturnType<typeof getProjectInfosQuery>,
) => {
  if (!project) throw new NotFoundError('Projet introuvable')
  if (!checkInsufficientRoleInProject(userId, { roles: project.roles, minRole: 'owner' })) return project
  // @ts-ignore
  project = exclude(project, ['clusters'])
  // TODO définir les clés disponibles des environnements par niveau d'autorisation
  // @ts-ignore
  project.environments = project.environments.filter(env => !checkInsufficientPermissionInEnvironment(userId, env.permissions, 0)).map(({ ...env }) => env)
  return project
}

// Routes logic
export const getProject = async (projectId: string, userId: User['id']) => {
  const project = await getProjectInfosQuery(projectId)
  if (!project) throw new NotFoundError('Projet introuvable', undefined)
  const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { roles: project.roles, minRole: 'user' })
  if (insufficientRoleErrorMessage) throw new ForbiddenError('Vous ne faites pas partie de ce projet', { description: '', extras: { userId, projectId: project.id } })

  return filterProject(userId, project)
}

export const getProjectSecrets = async (projectId: string, userId: User['id']) => {
  const project = await getProjectInfosQuery(projectId)
  if (!project) throw new NotFoundError('Projet introuvable', undefined)
  const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { roles: project.roles, minRole: 'owner' })
  if (insufficientRoleErrorMessage) throw new ForbiddenError(insufficientRoleErrorMessage, { description: '', extras: { userId, projectId: project.id } })

  const hookReply = await hook.project.getSecrets(project.id)
  if (hookReply.failed) {
    throw new UnprocessableContentError('Echec des services à la récupération des secrets du projet')
  }

  return Object.fromEntries(
    Object.entries(hookReply.results)
      // @ts-ignore
      .filter(([_key, value]) => value.secrets)
      // @ts-ignore
      .map(([key, value]) => [servicesInfos[key]?.title, value.secrets]))
}

export const createProject = async (dataDto: CreateProjectBody, requestor: UserDto, requestId: string) => {
  // Pré-requis
  const owner = await getOrCreateUser(requestor)
  const organization = await getOrganizationById(dataDto.organizationId)
  if (!organization) throw new NotFoundError('Organisation introuvable')
  await checkCreateProject(organization.name, dataDto)

  // Actions
  const project = await initializeProject({ ...dataDto, ownerId: owner.id })

  try {
    const { results } = await hook.project.upsert(project.id)
    await addLogs('Create Project', results, owner.id, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec des services à la création du projet')
    }

    const projectInfos = await getProjectInfosOrThrowQuery(project.id)

    return {
      ...projectInfos,
      description: projectInfos.description ?? '',
      clusterIds: projectInfos.clusters.map(({ id }) => id),
      members: rolesToMembers(projectInfos.roles),
    }
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const updateProject = async (data: UpdateProjectBody, projectId: Project['id'], requestor: UserDto, requestId: string) => {
  const keysAllowedForUpdate = ['description']
  const dataFiltered = filterObjectByKeys(data, keysAllowedForUpdate)

  // Pré-requis
  const project = await getProject(projectId, requestor.id)
  if (!project) throw new NotFoundError('Projet introuvable')
  if (project.locked) throw new ForbiddenError(projectIsLockedInfo)
  Object.keys(data).forEach(key => {
    // @ts-ignore
    project[key] = data[key]
  })

  const schemaValidation = ProjectSchemaV2.pick({ description: true }).safeParse(data)
  validateSchema(schemaValidation)

  // Actions
  try {
    await updateProjectQuery(projectId, dataFiltered)

    const { results } = await hook.project.upsert(project.id)
    await addLogs('Update Project', results, requestor.id, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec des services à la mise à jour du projet')
    }

    const projectInfos = await getProjectInfosOrThrowQuery(projectId)

    return {
      ...projectInfos,
      description: projectInfos.description ?? '',
      clusterIds: projectInfos.clusters.map(({ id }) => id),
      members: rolesToMembers(projectInfos.roles),
    }
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const replayHooks = async (projectId: Project['id'], requestor: KeycloakPayload, requestId: string) => {
  try {
    // Pré-requis
    const project = await getProjectInfosQuery(projectId)
    if (!project || project.status === 'archived') throw new NotFoundError('Projet introuvable')

    if (!hasGroupAdmin(requestor.groups)) {
      const insufficientRoleErrorMessage = checkInsufficientRoleInProject(requestor.id, { roles: project.roles, minRole: 'user' })
      if (insufficientRoleErrorMessage) throw new ForbiddenError(insufficientRoleErrorMessage)
    }

    // Actions
    const { results } = await hook.project.upsert(project.id)
    await addLogs('Replay hooks for Project', results, requestor.id, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec des services au reprovisionnement du projet')
    }
  } catch (error) {
    if (error instanceof DsoError) throw error
    throw new Error(error?.message)
  }
}

export const archiveProject = async (projectId: Project['id'], requestor: KeycloakPayload, requestId: string) => {
  // Pré-requis
  const project = await getProjectInfosAndRepos(projectId)
  if (!project) throw new NotFoundError('Projet introuvable')

  if (!requestor.groups?.includes(adminGroupPath)) {
    const insufficientRoleErrorMessage = checkInsufficientRoleInProject(requestor.id, { roles: project.roles, minRole: 'owner' })
    if (insufficientRoleErrorMessage) throw new ForbiddenError(insufficientRoleErrorMessage)
  }

  // Actions
  try {
    // Empty the project first
    await Promise.all([
      lockProject(projectId),
      deleteAllRepositoryForProject(projectId),
      deleteAllEnvironmentForProject(projectId),
      deleteAllRoleNonOwnerForProject(projectId),
    ])

    const { results: upsertResults } = await hook.project.upsert(project.id)
    await addLogs('Delete all project resources', upsertResults, requestor.id, requestId)
    if (upsertResults.failed) {
      throw new UnprocessableContentError('Echec des services à la suppression des ressources du projet')
    }

    // -- début - Suppression projet --
    const { results } = await hook.project.delete(project.id)
    await addLogs('Archive Project', results, requestor.id, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec des services à la suppression du projet')
    }

    // -- début - Retrait clusters --
    for (const cluster of project.clusters) {
      await removeClusterFromProject(cluster.id, project.id)
    }
    // -- fin - Retrait clusters cibles --

    // -- fin - Suppression projet --
  } catch (error) {
    if (error instanceof DsoError) throw error
    throw new Error(error?.message)
  }
}

export const handleProjectLocking = async (projectId: Project['id'], lock: Project['locked']) => {
  try {
    if (lock) {
      await lockProject(projectId)
    } else {
      await unlockProject(projectId)
    }
  } catch (error) {
    throw new BadRequestError(error.message)
  }
}

export const generateProjectsData = async () => {
  try {
    const projects = await getAllProjectsDataForExport()

    return json2csv(projects, {
      emptyFieldValue: '',
    })
  } catch (error) {
    throw new BadRequestError(error.message)
  }
}
