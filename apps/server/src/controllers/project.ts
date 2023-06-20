import {
  getUserProjects,
  getProject,
  initializeProject,
  updateProjectCreated,
  updateProjectFailed,
  getProjectById,
  lockProject,
  addUserToProject,
  archiveProject,
  // getProjectUsers,
  updateProjectServices,
  updateProject,
} from '../models/queries/project-queries.js'
import { getOrCreateUser } from '../models/queries/user-queries.js'
import {
  // deleteRoleByUserIdAndProjectId,
  getRoleByUserIdAndProjectId,
  getSingleOwnerByProjectId,
} from '../models/queries/users-projects-queries.js'
import { getOrganizationById } from '../models/queries/organization-queries.js'
import {
  getProjectRepositories,
  deleteRepository,
  updateRepositoryDeleting,
  getInfraProjectRepositories,
} from '../models/queries/repository-queries.js'
import {
  deleteEnvironment,
  getEnvironmentsByProjectId,
  updateEnvironmentDeleting,
} from '../models/queries/environment-queries.js'
import {
  getEnvironmentPermissions,
  deletePermissionById,
} from '../models/queries/permission-queries.js'
import { filterObjectByKeys, lowercaseFirstLetter, replaceNestedKeys } from '../utils/queries-tools.js'
import { addReqLogs } from '../utils/logger.js'
import { sendOk, sendCreated, sendUnprocessableContent, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
import { projectSchema, calcProjectNameMaxLength, projectIsLockedInfo } from 'shared'
import { getServices } from '../utils/services.js'
import { addLogs } from '../models/queries/log-queries.js'
import { hooks } from '../plugins/index.js'
import { gitlabUrl, projectRootDir } from '../utils/env.js'
import { unlockProjectIfNotFailed } from '../utils/controller.js'
import { PluginResult } from '@/plugins/hooks/hook.js'

// GET
export const getUserProjectsController = async (req, res) => {
  const requestor = req.session?.user

  try {
    const user = await getOrCreateUser(requestor)
    if (!user) return sendOk(res, [])

    let projects = await getUserProjects(user)

    addReqLogs({
      req,
      description: 'Projets de l\'utilisateur récupérés avec succès',
      extras: {
        userId: requestor.id,
      },
    })
    if (!projects.length) return sendOk(res, [])

    projects = projects.filter(project => project.status !== 'archived')
      .map(project => project.get({ plain: true }))
      .map(project => replaceNestedKeys(project, lowercaseFirstLetter))
      .map(project => ({ ...project, services: getServices(project) }))

    sendOk(res, projects)
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

export const getProjectOwnerController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const owner = await getSingleOwnerByProjectId(projectId)

    addReqLogs({
      req,
      description: 'Souscripteur du projet récupéré avec succès',
      extras: {
        ownerId: owner.id,
      },
    })
    sendOk(res, owner)
  } catch (error) {
    const description = 'Echec de la récupération du souscripteur du projet'
    addReqLogs({
      req,
      description,
      error,
    })
    sendNotFound(res, description)
  }
}

// POST
export const createProjectController = async (req, res) => {
  const data = req.body
  const user = req.session?.user

  let project
  let owner
  let organization

  try {
    owner = await getOrCreateUser({ id: user.id, email: user?.email, firstName: user?.firstName, lastName: user?.lastName })

    // TODO: Fix type
    // @ts-ignore See TODO
    const isValid = await hooks.createProject.validate({ owner: owner.dataValues })

    if (isValid?.failed) {
      const reasons = Object.values(isValid)
        .filter((plugin: PluginResult) => plugin?.status?.result === 'KO')
        .map((plugin: PluginResult) => plugin?.status?.message)
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
      addLogs('Create Project Validation', { reasons }, user.id)
      return
    }

    organization = await getOrganizationById(data.organization)

    await projectSchema.validateAsync(data, { context: { projectNameMaxLength: calcProjectNameMaxLength(organization.name) } })

    project = await getProject({ name: data.name, organization: data.organization })
    if (project?.status === 'archived') throw new Error(`"${data.name}" est archivé et n'est plus disponible`)
    if (project) throw new Error(`"${data.name}" existe déjà`)

    project = await initializeProject(data)
    await lockProject(project.id)

    await addUserToProject({ project, user: owner, role: 'owner' })
    project = { ...project.get({ plain: true }) }

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
  let isServicesCallOk
  try {
    const projectData = {
      ...project,
      organization: organization.name,
      owner: owner.dataValues,
    }
    projectData.project = projectData.name
    delete projectData.name

    // TODO: Fix type
    // @ts-ignore See TODO
    const results = await hooks.createProject.execute(projectData)
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
    isServicesCallOk = true
    addReqLogs({
      req,
      description: 'Projet créé avec succès par les plugins',
      extras: {
        projectId: project.id,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de la création du projet par les plugins',
      extras: {
        projectId: project.id,
      },
      error,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      await updateProjectCreated(project.id)
      await unlockProjectIfNotFailed(project.id)
    } else {
      await updateProjectFailed(project.id)
    }
    addReqLogs({
      req,
      description: 'Statut mis à jour après l\'appel aux plugins',
      extras: {
        projectId: project.id,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de mise à jour du statut après l\'appel aux plugins',
      extras: {
        projectId: project.id,
      },
    })
  }
}

// UPDATE
export const updateProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  const keysAllowedForUpdate = ['description']
  const data = filterObjectByKeys(req.body, keysAllowedForUpdate)

  try {
    let project = await getProjectById(projectId)
    if (!project) throw new Error('Projet introuvable')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const organization = await getOrganizationById(project.organization)

    project = project.get({ plain: true })
    project = {
      ...data,
      id: project.id,
      name: project.name,
      organization: project.organization,
    }
    await projectSchema.validateAsync(project, { context: { projectNameMaxLength: calcProjectNameMaxLength(organization.name) } })

    await lockProject(projectId)
    await updateProject(projectId, data)
    await unlockProjectIfNotFailed(projectId)

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
}

// DELETE
export const archiveProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  let repos
  let environments
  const permissions = []
  // let users
  let project
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Projet introuvable')

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')
    if (role.role !== 'owner') throw new Error('Vous n\'êtes pas souscripteur du projet')

    repos = await getProjectRepositories(projectId)
    environments = await getEnvironmentsByProjectId(projectId)
    environments?.forEach(async environment => {
      const envPerms = await getEnvironmentPermissions(environment?.id)
      permissions.push(...envPerms)
    })
    // users = await getProjectUsers(projectId)

    await lockProject(projectId)
    repos?.forEach(async repo => {
      await updateRepositoryDeleting(repo.id)
    })
    environments?.forEach(async environment => {
      await updateEnvironmentDeleting(environment.id)
    })

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

  // Process api call to external service
  let isServicesCallOk
  try {
    const organization = await getOrganizationById(project.organization)

    // -- début - Suppression environnements --

    const environmentsName = environments.map(env => env.name)
    const projectName = project.name
    const organizationName = organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organization.name}/${project.name}/`
    const repositories = (await getInfraProjectRepositories(project.id)).map(({ internalRepoName }) => ({
      url: `${gitlabBaseURL}/${internalRepoName}.git`,
      internalRepoName,
    }))

    for (const envName of environmentsName) {
      const envData = {
        environment: envName,
        project: projectName,
        organization: organizationName,
        repositories,
      }
      // TODO: Fix type
      // @ts-ignore See TODO
      const resultsEnv = await hooks.deleteEnvironment.execute(envData)
      await addLogs('Delete Environment', resultsEnv, userId)
      if (resultsEnv.failed) throw new Error('Echec des services à la suppression de l\'environnement')
    }
    // -- fin - Suppression environnements --

    const projectData = {
      ...project.get({ plain: true }),
      organization: organization.dataValues.name,
    }
    projectData.project = projectData.name
    delete projectData.name
    // TODO: Fix type
    // @ts-ignore See TODO
    const results = await hooks.archiveProject.execute(projectData)
    await addLogs('Delete Project', results, userId)
    if (results.failed) throw new Error('Echec de la suppression du projet par les plugins')
    isServicesCallOk = true
    addReqLogs({
      req,
      description: 'Projet supprimé avec succès par les plugins',
      extras: {
        projectId: project.id,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de la suppression du projet par les plugins',
      extras: {
        projectId,
      },
      error,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      repos?.forEach(async repo => {
        await deleteRepository(repo.id)
      })
      environments?.forEach(async environment => {
        await deleteEnvironment(environment.id)
      })
      permissions?.forEach(async permission => {
        await deletePermissionById(permission.id)
      })
      // TODO : garder les roles
      // users?.forEach(async user => {
      //   await deleteRoleByUserIdAndProjectId(user.id, projectId)
      // })
      await archiveProject(projectId)
    } else {
      await updateProjectFailed(projectId)
    }
    addReqLogs({
      req,
      description: 'Statut mis à jour après l\'appel aux plugins',
      extras: {
        projectId,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de mise à jour du statut après l\'appel aux plugins',
      extras: {
        projectId,
      },
      error,
    })
  }
}
