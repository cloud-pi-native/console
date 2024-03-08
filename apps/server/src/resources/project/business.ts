import {
  addLogs,
  deleteEnvironment,
  deleteRepository,
  getClusterById,
  getOrganizationById,
  getProjectByNames,
  getProjectInfos,
  getProjectInfosAndRepos,
  getProjectInfos as getProjectInfosQuery,
  getProjectPartialEnvironments,
  getPublicClusters,
  getQuotaStageById,
  getSingleOwnerByProjectId,
  getStageById,
  getUserProjects as getUserProjectsQuery,
  initializeProject,
  lockProject,
  removeClusterFromProject,
  updateProject as updateProjectQuery,
  updateProjectServices,
} from '@/resources/queries-index.js'
import type { Cluster, Environment, Log, Organization, Project, User } from '@prisma/client'
import { hook } from '@/utils/hook-wrapper.js'
import { type PluginResult, services, servicesInfos } from '@cpn-console/hooks'
import { checkInsufficientPermissionInEnvironment, checkInsufficientRoleInProject } from '@/utils/controller.js'
import { validateSchema } from '@/utils/business.js'
import { BadRequestError, ForbiddenError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import {
  type AsyncReturnType,
  type CreateProjectDto,
  type UpdateProjectDto,
  // calcProjectNameMaxLength,
  projectIsLockedInfo,
  ProjectSchema,
  exclude,
  adminGroupPath,
} from '@cpn-console/shared'
import { filterObjectByKeys } from '@/utils/queries-tools.js'
import { projectRootDir, gitlabUrl } from '@/utils/env.js'
import { type UserDto, getUser } from '@/resources/user/business.js'

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
    // @ts-ignore
    await addLogs('Create Project', results, owner.id, requestId)
    if (results.failed) {
      throw new Error('Echec de la création du projet par les plugins')
    }
    // enregistrement des ids GitLab et Harbor
    // @ts-ignore
    const { gitlab, registry }: { gitlab: PluginResult, registry: PluginResult } = results
    const services = {
      gitlab: {
        id: gitlab?.result?.group?.id,
      },
      registry: {
        id: registry?.result?.project?.project_id,
      },
    }
    await updateProjectServices(project.id, services)
    const publicClusters = await getPublicClusters()
    const projectInfos = await getProjectInfos(project.id)
    if (!projectInfos) throw new NotFoundError('Projet introuvable')
    projectInfos.clusters = projectInfos.clusters.concat(publicClusters)

    return { ...projectInfos, externalServices: projectServices(projectInfos) }
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const updateProject = async (data: UpdateProjectDto, projectId: Project['id'], requestor: UserDto, requestId: Log['requestId']) => {
  const keysAllowedForUpdate = ['description']
  const dataFiltered = filterObjectByKeys(data, keysAllowedForUpdate)

  // Pré-requis
  let project = await getProject(projectId, requestor.id)
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
    project = await getProjectInfosQuery(projectId)
    if (!project) throw new NotFoundError('Projet introuvable')

    const { results } = await hook.project.upsert(project.id)
    // @ts-ignore
    await addLogs('Update Project', results, requestor.id, requestId)
    if (results.failed) {
      throw new Error('Echec de la mise à jour du projet par les plugins')
    }
    return project
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const archiveProject = async (projectId: Project['id'], requestor: UserDto, requestId: Log['requestId']) => {
  // Pré-requis
  const project = await getProjectInfosAndRepos(projectId)
  if (!project) throw new NotFoundError('Projet introuvable')

  const owner = await getSingleOwnerByProjectId(project.id)
  if (!owner) throw new NotFoundError('Souscripteur introuvable')

  const insufficientRoleErrorMessage = checkInsufficientRoleInProject(requestor.id, { roles: project.roles, minRole: 'owner' })
  // @ts-ignore
  if (insufficientRoleErrorMessage && !requestor.groups?.includes(adminGroupPath)) throw new ForbiddenError(insufficientRoleErrorMessage)

  // Actions
  try {
    await lockProject(projectId)
    // TODO generate gitlabBaseUrl in gitlab plugin and propagate it to other plugins
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${project.organization.name}/${project.name}/`
    const repositories = project.repositories.map(repo => ({
      // TODO harmonize keys in plugins should be internalUrl
      internalUrl: `${gitlabBaseURL}/${repo.internalRepoName}.git`,
      url: `${gitlabBaseURL}/${repo.internalRepoName}.git`,
      ...repo,
    }))

    // -- début - Suppression environnements --
    let environments = await getProjectPartialEnvironments({ projectId })
    for (const environment of project.environments) {
      const cluster = await getClusterById(environment.clusterId)
      if (!cluster) throw new NotFoundError('Cluster introuvable')
      const quotaStage = await getQuotaStageById(environment.quotaStageId)
      if (!quotaStage) throw new NotFoundError('Association Quota - Type d\'environnement introuvable')
      const stage = await getStageById(quotaStage.stageId)
      if (!stage) throw new NotFoundError('Type d\'environnement introuvable')

      // Supprimer l'environnement
      const { results } = await hook.project.upsert(project.id)
      // @ts-ignore
      await addLogs('Delete Environments', results, requestor.id, requestId)
      if (results.failed) {
        throw new UnprocessableContentError('Echec des services à la suppression de l\'environnement')
      }
      await deleteEnvironment(environment.id)
      environments = environments.toSpliced(environments.findIndex(partialEnvironment => partialEnvironment.environment === environment.name), 1)
    }
    // -- fin - Suppression environnements --

    // #region Suppression repositories --
    for (const repo of repositories) {
      const { results } = await hook.project.upsert(project.id)
      // @ts-ignore
      await addLogs('Delete Repository', results, requestor.id, requestId)
      if (results.failed) {
        throw new UnprocessableContentError('Echec des services à la suppression de l\'environnement')
      }
      await deleteRepository(repo.id)
    }
    // #endregion Suppression repositories --

    // -- début - Retrait clusters --
    for (const cluster of project.clusters) {
      await removeClusterFromProject(cluster.id, project.id)
    }
    // -- fin - Retrait clusters cibles --

    // -- début - Suppression projet --
    const { results } = await hook.project.delete(project.id)
    // @ts-ignore
    await addLogs('Archive Project', results, requestor.id, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec de la suppression du projet par les plugins')
    }
    // -- fin - Suppression projet --
  } catch (error) {
    throw new Error(error?.message)
  }
}
