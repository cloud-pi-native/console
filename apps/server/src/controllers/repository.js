import {
  getRepositoryById,
  getProjectRepositories,
  initializeRepository,
  updateRepositoryCreated,
  updateRepositoryFailed,
  updateRepository,
  updateRepositoryDeleting,
  deleteRepository,
} from '../models/queries/repository-queries.js'
import {
  getProjectById,
  lockProject,
  unlockProject,
} from '../models/queries/project-queries.js'
import {
  getRoleByUserIdAndProjectId,
} from '../models/queries/users-projects-queries.js'
import {
  getEnvironmentsByProjectId,
} from '../models/queries/environment-queries.js'
import { filterObjectByKeys } from '../utils/queries-tools.js'
import { getLogInfos } from '../utils/logger.js'
import { sendOk, sendCreated, sendUnprocessableContent, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
import { getOrganizationById } from '../models/queries/organization-queries.js'
import { addLogs } from '../models/queries/log-queries.js'
import { gitlabUrl, projectRootDir } from '../utils/env.js'
import hooksFns from '../plugins/index.js'

// GET
export const getRepositoryByIdController = async (req, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  try {
    const repo = await getRepositoryById(repositoryId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: 'Dépôt récupéré',
    })
    sendOk(res, repo)
  } catch (error) {
    const message = 'Dépôt non trouvé'
    req.log.error({
      ...getLogInfos({ repositoryId }),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendNotFound(res, message)
  }
}

export const getProjectRepositoriesController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id
  try {
    const repos = await getProjectRepositories(projectId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Dépôts récupérés',
    })
    sendOk(res, repos)
  } catch (error) {
    const message = 'Dépôts non trouvés'
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendNotFound(res, message)
  }
}

// CREATE
export const createRepositoryController = async (req, res) => {
  const data = req.body
  const user = req.session?.user
  const projectId = req.params?.projectId
  data.projectId = projectId

  let project
  let repo
  try {
    const isValid = await hooksFns.createProject({ user }, true)

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
    project = await getProjectById(projectId)
    if (!project) throw new Error('Le projet n\'existe pas')

    const role = await getRoleByUserIdAndProjectId(user.id, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const repos = await getProjectRepositories(projectId)
    const isInternalRepoNameTaken = repos.find(repo => repo.internalRepoName === data.internalRepoName)
    if (isInternalRepoNameTaken) throw new Error(`Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`)

    await lockProject(projectId)
    repo = await initializeRepository(data)

    const message = 'Dépôt créé avec succès'
    req.log.info({
      ...getLogInfos({ repositoryId: repo.id }),
      description: message,
    })
    sendCreated(res, repo)
  } catch (error) {
    const message = 'Dépôt non créé'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return sendBadRequest(res, message)
  }

  // Process api call to external service
  let isServicesCallOk
  try {
    const organization = await getOrganizationById(project.organization)
    const environments = await getEnvironmentsByProjectId(project.id)
    const environmentNames = environments?.map(env => env.name)

    const repoData = {
      ...repo.get({ plain: true }),
      project: project.name,
      organization: organization.name,
      services: project.services,
      environment: environmentNames,
      internalUrl: `${gitlabUrl}/${projectRootDir}/${organization.name}/${project.name}/${repo.dataValues.internalRepoName}.git`,
    }
    if (data.isPrivate) {
      repoData.externalUserName = data.externalUserName
      repoData.externalToken = data.externalToken
    }

    const results = await hooksFns.createRepository(repoData)
    await addLogs('Create Repository', results, user.id)
    if (results.failed) throw new Error('Echec des services lors de la création du dépôt')
    isServicesCallOk = true
  } catch (error) {
    const message = `Echec requête ${req.id} : ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      await updateRepositoryCreated(repo.id)
    } else {
      await updateRepositoryFailed(repo.id)
    }
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ repositoryId: repo.id }),
      description: 'Statut du dépôt mis à jour, projet déverrouillé',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Echec de mise à jour du statut du dépôt, projet verrouillé',
      error: error.message,
      trace: error.trace,
    })
  }
}

// UPDATE
export const updateRepositoryController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId

  const keysAllowedForUpdate = [
    'externalRepoUrl',
    'isPrivate',
    'externalToken',
    'externalUserName',
  ]
  const data = filterObjectByKeys(req.body, keysAllowedForUpdate)

  let repo

  try {
    if (data.isPrivate && !data.externalToken) throw new Error('Le token est requis')
    if (data.isPrivate && !data.externalUserName) throw new Error('Le nom d\'utilisateur est requis')

    repo = await getRepositoryById(repositoryId)
    if (!repo) throw new Error('Dépôt introuvable')

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    await lockProject(projectId)
    await updateRepository(repositoryId, data.info)

    repo = await getRepositoryById(repositoryId)

    const message = 'Dépôt mis à jour'
    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: message,
    })
    sendOk(res, message)
  } catch (error) {
    const message = 'Dépôt non mis à jour'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return sendBadRequest(res, message)
  }

  // Process api call to external service
  let isServicesCallOk
  try {
    const project = await getProjectById(projectId)
    const organization = await getOrganizationById(project.organization)

    const repoData = {
      ...repo.get({ plain: true }),
      project: project.name,
      organization: organization.dataValues.name,
      services: project.services,
    }
    delete repoData?.isInfra
    delete repoData?.internalRepoName

    const results = await hooksFns.updateRepository(repoData)
    await addLogs('Update Repository', results, userId)
    if (results.failed) throw new Error('Echec des services associés au dépôt')
    isServicesCallOk = true
  } catch (error) {
    const message = `Echec requête ${req.id} : ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (!isServicesCallOk) {
      await updateRepositoryFailed(repo.id)
    }
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ repositoryId: repo.id }),
      description: 'Statut du dépôt mis à jour, projet déverrouillé',
    })
    return
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Echec de mise à jour du statut du dépôt, projet verrouillé',
      error: error.message,
      trace: error.trace,
    })
  }
}

// DELETE
export const deleteRepositoryController = async (req, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  let repo
  try {
    repo = await getRepositoryById(repositoryId)
    if (!repo) throw new Error('Dépôt introuvable')

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')
    if (role.role !== 'owner') throw new Error('Vous n\'êtes pas souscripteur du projet')

    await lockProject(projectId)
    await updateRepositoryDeleting(repositoryId)

    const message = 'Dépôt en cours de suppression'
    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: message,
    })
    sendOk(res, message)
  } catch (error) {
    const message = 'Dépôt non supprimé'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return sendForbidden(res, message)
  }

  // Process api call to external service
  let isServicesCallOk
  try {
    const project = await getProjectById(projectId)
    const organization = await getOrganizationById(project.organization)
    const environments = await getEnvironmentsByProjectId(project.id)
    const environmentNames = environments?.map(env => env.name)

    const repoData = {
      ...repo.get({ plain: true }),
      project: project.name,
      organization: organization.dataValues.name,
      services: project.services,
      environments: environmentNames,
    }

    const results = await hooksFns.deleteRepository(repoData)
    await addLogs('Delete Repository', results, userId)
    if (results.failed) throw new Error('Echec des opérations')
    isServicesCallOk = true
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: error.message,
      error: error.message,
      trace: error.trace,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      await deleteRepository(repositoryId)
    } else {
      await updateRepositoryFailed(repo.id)
    }
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ repositoryId: repo.id }),
      description: 'Projet déverrouillé',
    })
    return
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Echec, projet verrouillé',
      error: error.message,
      trace: error.trace,
    })
  }
}
