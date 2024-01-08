import {
  addLogs,
  archiveProject as archiveProjectQuery,
  deleteRepository,
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
  updateProjectCreated,
  updateProjectFailed,
  updateProject as updateProjectQuery,
  updateProjectServices,
} from '@/resources/queries-index.js'
import { hooks } from '@/plugins/index.js'
import type { Cluster, Environment, Organization, Project, QuotaStage, Stage, User } from '@prisma/client'
import { checkInsufficientPermissionInEnvironment, checkInsufficientRoleInProject } from '@/utils/controller.js'
import { unlockProjectIfNotFailed } from '@/utils/business.js'
import { BadRequestError, ForbiddenError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { type PluginResult } from '@/plugins/hooks/hook.js'
import {
  type AsyncReturnType,
  type CreateProjectDto,
  type UpdateProjectDto,
  calcProjectNameMaxLength,
  projectIsLockedInfo,
  projectSchema,
  exclude,
  adminGroupPath,
} from '@dso-console/shared'
import type { CreateProjectExecArgs, ProjectBase, UpdateProjectExecArgs } from '@/plugins/hooks/project.js'
import { filterObjectByKeys } from '@/utils/queries-tools.js'
import { projectRootDir } from '@/utils/env.js'
import { type UserDto, getUser } from '@/resources/user/business.js'
import { gitlabUrl } from '@/plugins/core/gitlab/utils.js'
import { getProjectServices, servicesInfos } from '@/plugins/services.js'
import { deleteEnvironments } from '../environment/business.js'

// Fetch infos
export const getProjectInfosAndClusters = async (projectId: string) => {
  const project = await getProjectInfosAndRepos(projectId)
  const projectClusters = project.clusters ? [...await getPublicClusters(), ...project.clusters] : [...await getPublicClusters()]
  return { project, projectClusters }
}

const projectServices = (project: Project & { organization: Organization, clusters: Pick<Cluster, 'id' | 'infos' | 'label' | 'privacy' | 'clusterResources'>[], environments: Array<Environment & { quotaStage: QuotaStage & { stage: Stage } }> }) => getProjectServices({
  project: project.name,
  organization: project.organization.name,
  services: project.services,
  environments: project.environments,
  clusters: project.clusters,
})

export const getUserProjects = async (requestor: UserDto) => {
  const user = await getUser(requestor)
  const projects = await getUserProjectsQuery(user)
  const publicClusters = await getPublicClusters()
  return projects.map(({
    services, // remove services from returned object as it may be sensitive
    ...infos
  }) => {
    infos.clusters = infos.clusters.concat(publicClusters)
    return {
      ...infos,
      externalServices: projectServices({ ...infos, services }), // but pass it to constitue externalServices
    }
  })
}

// Check logic
export const checkCreateProject = async (
  owner: User,
  organizationName: Organization['name'],
  data: CreateProjectDto,
) => {
  await projectSchema.validateAsync(data, { context: { projectNameMaxLength: calcProjectNameMaxLength(organizationName) } })

  const pluginsResults = await hooks.createProject.validate({ owner })
  if (pluginsResults?.failed) {
    const reasons = Object.values(pluginsResults)
      .filter((plugin: PluginResult) => plugin?.status?.result === 'KO')
      .map((plugin: PluginResult) => plugin.status.message)
      .join('; ')

    const message = 'Echec de la validation des prérequis de création du projet par les services externes'

    addLogs('Create Project Validation', { reasons, failed: true }, owner.id)
    throw new BadRequestError(message, { description: reasons })
  }
  const projectSearch = await getProjectByNames({ name: data.name, organizationName })
  if (projectSearch.length > 0) {
    throw new BadRequestError(`"${data.name}" existe déjà`, { extras: {}, description: `Le projet "${data.name}" existe déjà` })
  }
}

const filterProject = (
  userId: User['id'],
  project: AsyncReturnType<typeof getProjectInfosQuery>,
) => {
  if (!checkInsufficientRoleInProject(userId, { roles: project.roles, minRole: 'owner' })) return project
  project = exclude(project, ['clusters'])
  // TODO définir les clés disponibles des environnements par niveau d'autorisation
  project.environments = project.environments.filter(env => !checkInsufficientPermissionInEnvironment(userId, env.permissions, 0))
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

  const projectData: ProjectBase = {
    project: project.name,
    organization: project.organization.name,
  }

  const results = await hooks.getProjectSecrets.execute(projectData)
  if (results?.failed) throw new Error('Echec de récupération des secrets du projet par les plugins')
  const projectSecrets = Object.fromEntries(
    Object.entries(results)
      // @ts-ignore
      .filter(([_key, value]) => value.secrets)
      // @ts-ignore
      .map(([key, value]) => [servicesInfos[key]?.title, value.secrets]))

  return projectSecrets
}

export const createProject = async (dataDto: CreateProjectDto, requestor: UserDto) => {
  // Pré-requis
  const owner = await getUser(requestor)
  const organization = await getOrganizationById(dataDto.organizationId)
  await checkCreateProject(owner, organization.name, dataDto)

  // Actions
  const project = await initializeProject({ ...dataDto, ownerId: requestor.id })

  try {
    await lockProject(project.id)
    const projectData: CreateProjectExecArgs = {
      project: project.name,
      description: project.description === '' ? null : project.description,
      organization: organization.name,
      owner,
    }

    const results = await hooks.createProject.execute(projectData)
    // @ts-ignore
    await addLogs('Create Project', results, owner.id)
    if (results.failed) throw new Error('Echec de la création du projet par les plugins')

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
    await updateProjectCreated(project.id)
    await unlockProjectIfNotFailed(project.id)
    const publicClusters = await getPublicClusters()
    const { services: servicesInfos, ...projectInfos } = await getProjectInfos(project.id)
    projectInfos.clusters = projectInfos.clusters.concat(publicClusters)

    return { ...projectInfos, externalServices: projectServices({ ...projectInfos, services: servicesInfos }) }
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error(error?.message)
  }
}

export const updateProject = async (data: UpdateProjectDto, projectId: Project['id'], requestor: UserDto) => {
  const keysAllowedForUpdate = ['description']
  const dataFiltered = filterObjectByKeys(data, keysAllowedForUpdate)

  // Pré-requis
  let project = await getProject(projectId, requestor.id)
  if (!project) throw new NotFoundError('Projet introuvable', undefined)
  if (project.locked) throw new ForbiddenError(projectIsLockedInfo, undefined)
  Object.keys(data).forEach(key => {
    project[key] = data[key]
  })
  await projectSchema.validateAsync(project, { context: { projectNameMaxLength: calcProjectNameMaxLength(project.organization.name) } })

  // Actions
  try {
    await lockProject(project.id)
    await updateProjectQuery(projectId, dataFiltered)
    project = await getProjectInfosQuery(projectId)

    const projectData: UpdateProjectExecArgs = {
      project: project.name,
      description: project.description === '' ? null : project.description,
      status: project.status,
      organization: project.organization.name,
    }

    const results = await hooks.updateProject.execute(projectData)
    // @ts-ignore
    await addLogs('Update Project', results, requestor.id)
    if (results.failed) throw new Error('Echec de la mise à jour du projet par les plugins')

    await updateProjectCreated(project.id)
    return unlockProjectIfNotFailed(project.id)
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error(error?.message)
  }
}

export const archiveProject = async (projectId: Project['id'], requestor: UserDto) => {
  // Pré-requis
  const project = await getProjectInfosAndRepos(projectId)
  const owner = await getSingleOwnerByProjectId(project.id)

  if (!project) throw new NotFoundError('Projet introuvable')

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
    if (project.environments.length > 0) {
      await deleteEnvironments(
        project.environments.map(({ id }) => id),
        project.environments.map(env => ({ ...env, stage: env.quotaStage.stage.name })),
        project,
        repositories,
        [], // clusters are found by function
        requestor.id,
      )
    }
    // -- fin - Suppression environnements --

    // #region Suppression repositories --
    for (const repo of repositories) {
      const result = await hooks.deleteRepository.execute({
        environments: project.environments?.map(environment => environment?.name),
        project: project.name,
        organization: project.organization.name,
        ...repo,
      })
      // @ts-ignore
      await addLogs('Delete Repository', result, requestor.id)
      if (result.failed) throw new UnprocessableContentError('Echec des services à la suppression de l\'environnement')
      await deleteRepository(repo.id)
    }
    // #endregion Suppression repositories --

    // -- début - Retrait clusters --
    for (const cluster of project.clusters) {
      await removeClusterFromProject(cluster.id, project.id)
    }
    // -- fin - Retrait clusters cibles --

    // -- début - Suppression projet --
    const results = await hooks.archiveProject.execute({
      organization: project.organization.name,
      project: project.name,
      status: 'archived',
      owner,
    })
    // @ts-ignore
    await addLogs('Archive Project', results, requestor.id)
    if (results.failed) throw new UnprocessableContentError('Echec de la suppression du projet par les plugins')
    await archiveProjectQuery(projectId)
    // -- fin - Suppression projet --
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error(error?.message)
  }
}
