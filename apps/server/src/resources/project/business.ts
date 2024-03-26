import type { Cluster, Environment, Organization, Project, User } from '@prisma/client'
import type { KeycloakPayload } from 'fastify-keycloak-adapter'
import {
  ProjectSchema,
  adminGroupPath,
  exclude,
  projectIsLockedInfo,
  type AsyncReturnType,
  type CreateProjectDto,
  type UpdateProjectDto,
} from '@cpn-console/shared'
import { services, servicesInfos } from '@cpn-console/hooks'
import {
  addLogs,
  deleteAllEnvironmentForProject,
  deleteAllRepositoryForProject,
  deleteAllRoleNonOwnerForProject,
  getOrganizationById,
  getProjectByNames,
  getProjectInfos,
  getProjectInfosAndRepos,
  getProjectInfos as getProjectInfosQuery,
  getPublicClusters,
  getSingleOwnerByProjectId,
  getUserProjects as getUserProjectsQuery,
  initializeProject,
  lockProject,
  removeClusterFromProject,
  updateProject as updateProjectQuery,
} from '@/resources/queries-index.js'
import { getUser, type UserDto } from '@/resources/user/business.js'
import { validateSchema } from '@/utils/business.js'
import { checkInsufficientPermissionInEnvironment, checkInsufficientRoleInProject } from '@/utils/controller.js'
import { BadRequestError, DsoError, ForbiddenError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'
import { filterObjectByKeys } from '@/utils/queries-tools.js'

// Fetch infos
export const getProjectInfosAndClusters = async (projectId: string) => {
  const project = await getProjectInfosQuery(projectId)
  if (!project) throw new NotFoundError('Projet introuvable')
  const projectClusters = project.clusters ? [...await getPublicClusters(), ...project.clusters] : [...await getPublicClusters()]
  return { project, projectClusters }
}

const projectServices = (project: Project & { organization: Organization, environments: Environment[], clusters: Pick<Cluster, 'id' | 'infos' | 'label' | 'privacy' | 'clusterResources'>[] }) => services.getForProject({
  project: project.name,
  organization: project.organization.name,
  services: project.services,
  environments: project.environments,
  // @ts-ignore
  clusters: project.clusters,
})

export const getUserProjects = async (requestor: UserDto) => {
  const user = await getUser(requestor)
  const projects = await getUserProjectsQuery(user)
  const publicClusters = await getPublicClusters()
  return projects.map((project) => {
    project.clusters = project.clusters.concat(publicClusters)
    return {
      ...project,
      externalServices: projectServices(project),
    }
  })
}

// Check logic
export const checkCreateProject = async (
  organizationName: Organization['name'],
  data: CreateProjectDto,
) => {
  const schemaValidation = ProjectSchema.omit({ id: true, organizationId: true, status: true, locked: true }).safeParse(data)
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
  project.environments = project?.environments?.filter(env => !checkInsufficientPermissionInEnvironment(userId, env.permissions, 0))
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

  const results = await hook.project.getSecrets(project.id)
  if (results.failed) {
    throw new Error('Echec de récupération des secrets du projet par les plugins')
  }

  return Object.fromEntries(
    Object.entries(results.results)
      // @ts-ignore
      .filter(([_key, value]) => value.secrets)
      // @ts-ignore
      .map(([key, value]) => [servicesInfos[key]?.title, value.secrets]))
}

export const createProject = async (dataDto: CreateProjectDto, requestor: UserDto, requestId: string) => {
  // Pré-requis
  const owner = await getUser(requestor)
  const organization = await getOrganizationById(dataDto.organizationId)
  if (!organization) throw new NotFoundError('Organisation introuvable')
  await checkCreateProject(organization.name, dataDto)

  // Actions
  const project = await initializeProject({ ...dataDto, ownerId: requestor.id })

  try {
    const { results } = await hook.project.upsert(project.id)

    await addLogs('Create Project', results, owner.id, requestId)
    if (results.failed) {
      throw new Error('Echec de la création du projet par les plugins')
    }

    const publicClusters = await getPublicClusters()
    const projectInfos = await getProjectInfos(project.id)
    if (!projectInfos) throw new NotFoundError('Projet introuvable')
    projectInfos.clusters = projectInfos.clusters.concat(publicClusters)

    return { ...projectInfos, externalServices: projectServices(projectInfos) }
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const updateProject = async (data: UpdateProjectDto, projectId: Project['id'], requestor: UserDto, requestId: string) => {
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

  const schemaValidation = ProjectSchema.pick({ description: true }).safeParse(data)
  validateSchema(schemaValidation)

  // Actions
  try {
    await updateProjectQuery(projectId, dataFiltered)

    const { results } = await hook.project.upsert(project.id)

    await addLogs('Update Project', results, requestor.id, requestId)
    if (results.failed) {
      throw new Error('Echec de la mise à jour du projet par les plugins')
    }
    return getProjectInfosQuery(projectId)
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const replayHooks = async (projectId: Project['id'], requestor: KeycloakPayload, requestId: string) => {
  try {
    // Pré-requis
    const project = await getProjectInfosQuery(projectId)
    if (!project) throw new NotFoundError('Projet introuvable')

    if (!requestor.groups?.includes(adminGroupPath)) {
      const insufficientRoleErrorMessage = checkInsufficientRoleInProject(requestor.id, { roles: project.roles, minRole: 'user' })
      if (insufficientRoleErrorMessage) throw new ForbiddenError(insufficientRoleErrorMessage)
    }

    // Actions
    const { results } = await hook.project.upsert(project.id)

    await addLogs('Replay hooks for Project', results, requestor.id, requestId)
    if (results.failed) {
      throw new Error('Echec du reprovisionnement du projet par les plugins')
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

  const owner = await getSingleOwnerByProjectId(project.id)
  if (!owner) throw new NotFoundError('Souscripteur introuvable')

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
      throw new UnprocessableContentError('Echec de la suppression des ressources du projet par les plugins')
    }

    // -- début - Suppression projet --
    const { results } = await hook.project.delete(project.id)

    await addLogs('Archive Project', results, requestor.id, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec de la suppression du projet par les plugins')
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
