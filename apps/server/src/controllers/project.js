import {
  getUserProjects,
  getProject,
  initializeProject,
  updateProjectCreated,
  updateProjectFailed,
  getProjectById,
  lockProject,
  unlockProject,
  addUserToProject,
  archiveProject,
  getProjectUsers,
  updateProjectServices,
  updateProject,
} from '../models/queries/project-queries.js'
import { getOrCreateUser } from '../models/queries/user-queries.js'
import {
  deleteRoleByUserIdAndProjectId,
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
import { getLogInfos } from '../utils/logger.js'
import { sendOk, sendCreated, sendUnprocessableContent, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
import { projectSchema } from 'shared/src/schemas/project.js'
import { calcProjectNameMaxLength } from 'shared/src/utils/functions.js'
import { getServices } from '../utils/services.js'
import { addLogs } from '../models/queries/log-queries.js'
import hooksFns from '../plugins/index.js'
import { gitlabUrl, projectRootDir } from '../utils/env.js'

// GET
export const getUserProjectsController = async (req, res) => {
  const requestor = req.session?.user

  try {
    const user = await getOrCreateUser(requestor)
    if (!user) return sendOk(res, [])

    let projects = await getUserProjects(user)
    req.log.info({
      ...getLogInfos(),
      description: 'Projets récupérés',
    })
    if (!projects.length) return sendOk(res, [])

    projects = projects.filter(project => project.status !== 'archived')
      .map(project => project.get({ plain: true }))
      .map(project => replaceNestedKeys(project, lowercaseFirstLetter))
      .map(project => ({ ...project, services: getServices(project) }))

    sendOk(res, projects)
  } catch (error) {
    const message = `Projets non trouvés: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendNotFound(res, message)
  }
}

export const getProjectByIdController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  try {
    const project = await getProjectById(projectId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Projet récupéré',
    })
    sendOk(res, project)
  } catch (error) {
    const message = `Projet non trouvé: ${error.message}`
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendNotFound(res, message)
  }
}

export const getProjectOwnerController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const owner = await getSingleOwnerByProjectId(projectId)
    req.log.info({
      ...getLogInfos({ owner }),
      description: 'Propriétaire du projet récupéré avec succès',
    })
    sendOk(res, owner)
  } catch (error) {
    const message = `Projet non trouvé: ${error.message}`
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendNotFound(res, message)
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

    const isValid = await hooksFns.createProject({ owner }, true)

    if (isValid?.failed) {
      const reasons = Object.values(isValid)
        .filter(({ status }) => status?.result === 'KO')
        .map(({ status }) => status?.message)
        .join('; ')
      sendUnprocessableContent(res, reasons)
      req.log.error(reasons)
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

    req.log.info({
      ...getLogInfos({
        projectId: project.id,
      }),
      description: 'Projet créé en base de données',
    })
    sendCreated(res, project)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Projet non créé: ${error.message}`,
      error: error.message,
      stack: error.stack,
      data: error.request,
    })
    return sendBadRequest(res, error.message)
  }

  // Process api call to external service
  let isServicesCallOk
  try {
    const projectData = {
      ...project,
      organization: organization.name,
      owner,
    }
    projectData.project = projectData.name
    delete projectData.name

    const results = await hooksFns.createProject(projectData)
    await addLogs('Create Project', results, owner.id)
    if (results.failed) throw new Error('Echec des services lors de la création du projet')

    // enregistrement des ids GitLab et Harbor
    const { gitlab, registry } = results
    const services = {
      gitlab: {
        id: gitlab?.result?.group?.id,
      },
      registry: {
        id: registry?.result?.project?.project_id,
      },
    }
    await updateProjectServices(project.id, services)

    isServicesCallOk = true
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Echec requête ${req.id} : ${error.message}`,
      error: error.message,
      trace: error.trace,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      await updateProjectCreated(project.id)
    } else {
      await updateProjectFailed(project.id)
    }
    await unlockProject(project.id)

    req.log.info({
      ...getLogInfos({ projectId: project.id }),
      description: 'Projet déverrouillé',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Echec, projet verrouillé',
      error: error.message,
      trace: error.trace,
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
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project déverrouillé',
    })
    sendOk(res, projectId)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Description du projet non mise à jour : ${error.message}`,
      error: error.message,
      stack: error.stack,
      data: error.request,
    })
    return sendBadRequest(res, error.message)
  }
}

// DELETE
export const archiveProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  let repos
  let environments
  const permissions = []
  let users
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
    users = await getProjectUsers(projectId)

    await lockProject(projectId)
    repos?.forEach(async repo => {
      await updateRepositoryDeleting(repo.id)
    })
    environments?.forEach(async environment => {
      await updateEnvironmentDeleting(environment.id)
    })
    req.log.info({
      ...getLogInfos({
        projectId,
      }),
      description: 'Projet en cours de suppression',
    })
    sendOk(res, projectId)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Echec de suppression du projet : ${error.message}`,
      error: error.message,
      trace: error.trace,
    })
    return sendForbidden(res, error.message)
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
      const resultsEnv = await hooksFns.deleteEnvironment(envData)
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
    const results = await hooksFns.archiveProject(projectData)
    await addLogs('Delete Project', results, userId)
    if (results.failed) throw new Error('Echec des services à la suppression du projet')

    isServicesCallOk = true
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Echec requête ${req.id} : ${error.message}`,
      error: error.message,
      trace: error.trace,
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
      users?.forEach(async user => {
        await deleteRoleByUserIdAndProjectId(user.id, projectId)
      })
      await archiveProject(projectId)
    } else {
      await updateProjectFailed(projectId)
    }
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project déverrouillé',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Echec, projet verrouillé',
      error: error.message,
    })
  }
}
