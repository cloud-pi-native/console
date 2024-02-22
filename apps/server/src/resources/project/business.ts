import {
  addLogs,
  archiveProject as archiveProjectQuery,
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
import type { Cluster, Environment, Log, Organization, Project, User } from '@prisma/client'
import { hooks, services, servicesInfos } from '@cpn-console/hooks'
import type { PluginResult, CreateProjectExecArgs, ProjectBase, UpdateProjectExecArgs } from '@cpn-console/hooks'
import { checkInsufficientPermissionInEnvironment, checkInsufficientRoleInProject } from '@/utils/controller.js'
import { unlockProjectIfNotFailed, checkCreateProject as checkCreateProjectPlugins, validateSchema } from '@/utils/business.js'
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
  const projectClusters = project.clusters ? [...await getPublicClusters(), ...project.clusters] : [...await getPublicClusters()]
  return { project, projectClusters }
}

const projectServices = (project: Project & { organization: Organization, environments: Environment[], clusters: Pick<Cluster, 'id' | 'infos' | 'label' | 'privacy' | 'clusterResources'>[] }) => services.getForProject({
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
  owner: User,
  organizationName: Organization['name'],
  data: CreateProjectDto,
  requestId: Log['requestId'],
) => {
  const schemaValidation = ProjectSchema.omit({ id: true, organizationId: true, status: true, locked: true }).safeParse(data)
  validateSchema(schemaValidation)

  await checkCreateProjectPlugins(owner, 'Project', requestId)

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
    Object.entries(results.results)
      .filter(([_key, value]) => value.secrets)
      .map(([key, value]) => [servicesInfos[key]?.title, value.secrets]))

  return projectSecrets
}

export const createProject = async (dataDto: CreateProjectDto, requestor: UserDto, requestId: Log['requestId']) => {
  // Pré-requis
  const owner = await getUser(requestor)
  const organization = await getOrganizationById(dataDto.organizationId)
  await checkCreateProject(owner, organization.name, dataDto, requestId)

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
    await addLogs('Create Project', results, owner.id, requestId)
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
    const projectInfos = await getProjectInfos(project.id)
    projectInfos.clusters = projectInfos.clusters.concat(publicClusters)

    return { ...projectInfos, externalServices: projectServices(projectInfos) }
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error(error?.message)
  }
}

export const updateProject = async (data: UpdateProjectDto, projectId: Project['id'], requestor: UserDto, requestId: Log['requestId']) => {
  const keysAllowedForUpdate = ['description']
  const dataFiltered = filterObjectByKeys(data, keysAllowedForUpdate)

  // Pré-requis
  let project = await getProject(projectId, requestor.id)
  if (!project) throw new NotFoundError('Projet introuvable', undefined)
  if (project.locked) throw new ForbiddenError(projectIsLockedInfo, undefined)
  Object.keys(data).forEach(key => {
    project[key] = data[key]
  })

  const schemaValidation = ProjectSchema.pick({ description: true }).safeParse(data)
  validateSchema(schemaValidation)

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
    await addLogs('Update Project', results, requestor.id, requestId)
    if (results.failed) throw new Error('Echec de la mise à jour du projet par les plugins')

    await updateProjectCreated(project.id)
    return unlockProjectIfNotFailed(project.id)
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error(error?.message)
  }
}

export const archiveProject = async (projectId: Project['id'], requestor: UserDto, requestId: Log['requestId']) => {
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
    let environments = await getProjectPartialEnvironments({ projectId })
    for (const environment of project.environments) {
      const cluster = await getClusterById(environment.clusterId)

      // Supprimer l'environnement
      const envData = {
        environment: environment.name,
        environments,
        project: project.name,
        organization: project.organization.name,
        repositories,
        cluster: {
          ...cluster,
          ...cluster.kubeconfig,
        },
      }
      // @ts-ignore
      const resultsEnv = await hooks.deleteEnvironment.execute(envData)
      // @ts-ignore
      await addLogs('Delete Environments', resultsEnv, requestor.id, requestId)
      if (resultsEnv.failed) throw new UnprocessableContentError('Echec des services à la suppression de l\'environnement')
      await deleteEnvironment(environment.id)
      environments = environments.toSpliced(environments.findIndex(partialEnvironment => partialEnvironment.environment === environment.name), 1)
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
      await addLogs('Delete Repository', result, requestor.id, requestId)
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
    await addLogs('Archive Project', results, requestor.id, requestId)
    if (results.failed) throw new UnprocessableContentError('Echec de la suppression du projet par les plugins')
    await archiveProjectQuery(projectId)
    // -- fin - Suppression projet --
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error(error?.message)
  }
}
