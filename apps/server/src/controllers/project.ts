import {
  addLogs,
  archiveProject,
  deleteEnvironment,
  deleteRepository,
  getClusterByEnvironmentId,
  getOrCreateUser,
  getOrganizationById,
  getProjectById,
  getProjectByNames,
  getProjectInfos,
  getProjectInfosAndRepos,
  getPublicClusters,
  getRoleByUserIdAndProjectId,
  getUserProjects,
  initializeProject,
  lockProject,
  updateProject,
  updateProjectCreated,
  updateProjectFailed,
  updateProjectServices,
} from '../queries/index.js'
import { filterObjectByKeys } from '../utils/queries-tools.js'
import { addReqLogs } from '../utils/logger.js'
import {
  sendOk,
  sendCreated,
  sendUnprocessableContent,
  sendNotFound,
  sendBadRequest,
  sendForbidden,
} from '../utils/response.js'
import {
  calcProjectNameMaxLength,
  projectIsLockedInfo,
  projectSchema,
  type CreateProjectDto,
} from 'shared'
import { getServices } from '../utils/services.js'
import { hooks } from '../plugins/index.js'
import { gitlabUrl, projectRootDir } from '../utils/env.js'
import { type AsyncReturnType, hasRoleInProject, unlockProjectIfNotFailed } from '../utils/controller.js'
import type { PluginResult } from '@/plugins/hooks/hook.js'
import type { CreateProjectExecArgs, UpdateProjectExecArgs } from '@/plugins/hooks/project.js'
import type { EnhancedFastifyRequest } from '@/types/index.js'
import { removeClustersFromEnvironmentBusiness } from '@/business/environment.js'

// GET
export const getUserProjectsController = async (req: EnhancedFastifyRequest<void>, res) => {
  const requestor = req.session?.user

  try {
    const user = await getOrCreateUser({ id: requestor.id, email: requestor.email, firstName: requestor.firstName, lastName: requestor.lastName })
    const projects = await getUserProjects(user)
    const publicClusters = await getPublicClusters()

    addReqLogs({
      req,
      description: 'Projets de l\'utilisateur récupérés avec succès',
      extras: {
        userId: requestor.id,
      },
    })

    const projectsInfos = projects.map((project) => {
      project.clusters = project.clusters.concat(publicClusters)
      if (Object.keys(project?.services).includes('registry')) {
        return { ...project, services: getServices(project) }
      }
      return project
    })

    sendOk(res, projectsInfos)
  } catch (error) {
    const description = 'Echec de la récupération des projets de l\'utilisateur'
    addReqLogs({
      req,
      description,
      extras: {
        userId: requestor.id,
      },
      error,
    })
    sendNotFound(res, description)
  }
}

export const getProjectByIdController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  try {
    const project = await getProjectById(projectId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    addReqLogs({
      req,
      description: 'Projet de l\'utilisateur récupéré avec succès',
      extras: {
        projectId,
        userId,
      },
    })
    sendOk(res, project)
  } catch (error) {
    const description = 'Echec de récupération du projet de l\'utilisateur'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        userId,
      },
      error,
    })
    sendNotFound(res, description)
  }
}

// POST
export const createProjectController = async (req: EnhancedFastifyRequest<CreateProjectDto>, res) => {
  const requestor = req.session?.user
  const data = req.body

  let project: AsyncReturnType<typeof initializeProject>
  let owner: AsyncReturnType<typeof getOrCreateUser>
  let organization: AsyncReturnType<typeof getOrganizationById>

  try {
    owner = await getOrCreateUser({ id: requestor.id, email: requestor.email, firstName: requestor.firstName, lastName: requestor.lastName })
    const isValid = await hooks.createProject.validate({ owner })
    if (isValid?.failed) {
      const reasons = Object.values(isValid)
        .filter((plugin: PluginResult) => plugin?.status?.result === 'KO')
        .map((plugin: PluginResult) => plugin.status.message)
        .join('; ')
      sendUnprocessableContent(res, reasons)

      addReqLogs({
        req,
        description: 'Echec de la validation des prérequis de création du projet par les services externes',
        extras: {
          reasons,
        },
        error: new Error('Failed to validate project creation'),
      })
      addLogs('Create Project Validation', { reasons }, owner.id)
      return
    }

    organization = await getOrganizationById(data.organizationId)

    await projectSchema.validateAsync(data, { context: { projectNameMaxLength: calcProjectNameMaxLength(organization.name) } })

    const projectSearch = await getProjectByNames({ name: data.name, organizationName: organization.name })
    if (projectSearch.length > 0) {
      if (projectSearch[0].status === 'archived') return sendBadRequest(res, `"${data.name}" est archivé et n'est plus disponible`)
      return sendBadRequest(res, `"${data.name}" existe déjà`)
    }

    project = await initializeProject({ ...data, ownerId: requestor.id })

    addReqLogs({
      req,
      description: 'Projet créé avec succès',
      extras: {
        projectId: project.id,
      },
    })
    sendCreated(res, project)
  } catch (error) {
    const description = 'Echec de la création du projet'
    addReqLogs({
      req,
      description,
      error,
    })
    return sendBadRequest(res, description)
  }

  // Process api call to external service
  try {
    const projectData: CreateProjectExecArgs = {
      project: project.name,
      description: project.description === '' ? null : project.description,
      status: project.status,
      organization: organization.name,
      owner,
    }

    // TODO: Fix type
    const results = await hooks.createProject.execute(projectData)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Create Project', results, owner.id)
    if (results.failed) throw new Error('Echec de la création du projet par les plugins')

    // enregistrement des ids GitLab et Harbor
    // @ts-ignore
    const { gitlab, registry }: { gitlab: PluginResult, registry: PluginResult } = results
    const services = {
      gitlab: {
        // @ts-ignore
        id: gitlab?.result?.group?.id,
      },
      registry: {
        // @ts-ignore
        id: registry?.result?.project?.project_id,
      },
    }
    await updateProjectServices(project.id, services)
    await updateProjectCreated(project.id)
    await unlockProjectIfNotFailed(project.id)
    addReqLogs({
      req,
      description: 'Projet créé avec succès par les plugins',
      extras: {
        projectId: project.id,
      },
    })
  } catch (error) {
    await updateProjectFailed(project.id)
    addReqLogs({
      req,
      description: 'Echec de la création du projet par les plugins',
      extras: {
        projectId: project.id,
      },
      error,
    })
  }
}

// UPDATE
export const updateProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  const keysAllowedForUpdate = ['description']
  const data = filterObjectByKeys(req.body, keysAllowedForUpdate)

  let project
  try {
    project = await getProjectInfos(projectId)
    if (!project) throw new Error('Projet introuvable')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    const isProjectOwner = await hasRoleInProject(userId, { roles: project.roles, minRole: 'owner' })
    if (!isProjectOwner) throw new Error('Vous n\'êtes pas membre du projet')

    await updateProject(projectId, data)
    project = await getProjectInfos(projectId)

    addReqLogs({
      req,
      description: 'Projet mis à jour avec succès',
      extras: {
        projectId,
      },
    })
    sendOk(res, projectId)
  } catch (error) {
    const description = 'Echec de la mise à jour du projet'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
      },
      error,
    })
    return sendBadRequest(res, description)
  }

  // Process api call to external service
  try {
    const projectData: UpdateProjectExecArgs = {
      project: project.name,
      description: project.description === '' ? null : project.description,
      status: project.status,
      organization: project.organization.name,
    }

    const results = await hooks.updateProject.execute(projectData)
    await addLogs('Update Project', results, userId)
    if (results.failed) throw new Error('Echec de la mise à jour du projet par les plugins')

    await updateProjectCreated(project.id)
    await unlockProjectIfNotFailed(project.id)
    addReqLogs({
      req,
      description: 'Projet mis à jour avec succès par les plugins',
      extras: {
        projectId: project.id,
      },
    })
  } catch (error) {
    await updateProjectFailed(project.id)
    addReqLogs({
      req,
      description: 'Echec de la mise à jour du projet par les plugins',
      extras: {
        projectId: project.id,
      },
      error,
    })
  }
}

// DELETE
export const archiveProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  let project: AsyncReturnType<typeof getProjectInfosAndRepos>
  try {
    project = await getProjectInfosAndRepos(projectId)
    if (!project) throw new Error('Projet introuvable')

    const isProjectOwner = await hasRoleInProject(userId, { roles: project.roles, minRole: 'owner' })
    if (!isProjectOwner) throw new Error('Vous n\'êtes pas souscripteur du projet')

    await lockProject(projectId)

    addReqLogs({
      req,
      description: 'Projet en cours de suppression',
      extras: {
        projectId,
      },
    })
    sendOk(res, projectId)
  } catch (error) {
    const description = 'Echec de la suppression du projet'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
      },
      error,
    })
    return sendForbidden(res, description)
  }

  try {
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${project.organization.name}/${project.name}/`
    const repositories = project.repositories.map(repo => ({
      // TODO harmonize keys in plugins should be internalUrl
      internalUrl: `${gitlabBaseURL}/${repo.internalRepoName}.git`,
      url: `${gitlabBaseURL}/${repo.internalRepoName}.git`,
      ...repo,
    }))
    const environmentNames = project.environments.map(({ name }) => name)

    // -- début - Suppression environnements --
    for (const env of project.environments) {
      const clusters = await getClusterByEnvironmentId(env.id)
      await removeClustersFromEnvironmentBusiness(clusters, env.name, env.id, project.name, project.organization.name, userId)
      const envData = {
        environment: env.name,
        project: project.name,
        organization: project.organization.name,
        repositories,
      }
      // TODO: Fix type
      const resultsEnv = await hooks.deleteEnvironment.execute(envData)
      await addLogs('Delete Environments', resultsEnv, userId)
      // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
      if (resultsEnv.failed) throw new Error('Echec des services à la suppression de l\'environnement')
      await deleteEnvironment(env.id)
    }
    // -- fin - Suppression environnements --

    // -- début - Suppression repositories --
    for (const repo of repositories) {
      const result = await hooks.deleteRepository.execute({
        environments: environmentNames,
        project: project.name,
        organization: project.organization.name,
        ...repo,
      })
      await addLogs('Delete Repository', result, userId)
      // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
      if (result.failed) throw new Error('Echec des services à la suppression de l\'environnement')
      await deleteRepository(repo.id)
    }
    // -- fin - Suppression repositories --

    // -- début - Suppression projet --
    const results = await hooks.archiveProject.execute({
      organization: project.organization.name,
      project: project.name,
      status: 'archived',
    })
    await addLogs('Archive Project', results, userId)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    if (results.failed) throw new Error('Echec de la suppression du projet par les plugins')
    await archiveProject(projectId)
    // -- fin - Suppression projet --

    addReqLogs({
      req,
      description: 'Projet supprimé avec succès par les plugins',
      extras: {
        projectId: project.id,
      },
    })
  } catch (error) {
    await updateProjectFailed(project.id)
    addReqLogs({
      req,
      description: 'Echec de la suppression du projet par les plugins',
      extras: {
        projectId,
      },
      error,
    })
  }
}
