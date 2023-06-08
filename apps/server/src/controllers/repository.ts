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
} from '../models/queries/project-queries.js'
import {
  getRoleByUserIdAndProjectId,
} from '../models/queries/users-projects-queries.js'
import {
  getEnvironmentsByProjectId,
} from '../models/queries/environment-queries.js'
import { filterObjectByKeys } from '../utils/queries-tools.js'
import { addReqLogs } from '../utils/logger.js'
import { sendOk, sendCreated, sendUnprocessableContent, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
import { getOrganizationById } from '../models/queries/organization-queries.js'
import { addLogs } from '../models/queries/log-queries.js'
import { gitlabUrl, projectRootDir } from '../utils/env.js'
import { unlockProjectIfNotFailed } from '../utils/controller.js'
import hooksFns from '../plugins/index.js'
import { projectIsLockedInfo } from 'shared'

// GET
export const getRepositoryByIdController = async (req, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  try {
    const repo = await getRepositoryById(repositoryId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    addReqLogs({
      req,
      description: 'Dépôt récupéré avec succès',
      extras: {
        repositoryId,
        projectId,
      },
    })
    sendOk(res, repo)
  } catch (error) {
    const description = 'Echec de la récupération du dépôt'
    addReqLogs({
      req,
      description,
      extras: {
        repositoryId,
        projectId,
      },
      error,
    })
    sendNotFound(res, description)
  }
}

export const getProjectRepositoriesController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id
  try {
    const repos = await getProjectRepositories(projectId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    addReqLogs({
      req,
      description: 'Dépôts du projet récupérés avec succès',
      extras: {
        projectId,
        repositoriesId: repos.map(({ id }) => id),
      },
    })
    sendOk(res, repos)
  } catch (error) {
    const description = 'Echec de la récupération des dépôt du projet'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
      },
      error,
    })
    sendNotFound(res, description)
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
    // TODO: Fix type
    // @ts-ignore See TODO
    const isValid = await hooksFns.createProject({ owner: user }, true)
    if (isValid?.failed) {
      const reasons = Object.values(isValid)
        .filter(({ status }) => status?.result === 'KO')
        .map(({ status }) => status?.message)
        .join('; ')
      sendUnprocessableContent(res, reasons)

      addReqLogs({
        req,
        description: 'Dépôt récupéré avec succès',
        extras: {
          reasons,
        },
        error: new Error('Failed to validation repository creation'),
      })
      addLogs('Create Project Validation', { reasons }, user.id)
      return
    }
    project = await getProjectById(projectId)
    if (!project) throw new Error('Le projet n\'existe pas')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    const role = await getRoleByUserIdAndProjectId(user.id, projectId)
    if (!role) return sendForbidden(res, 'Vous n\'êtes pas membre du projet')

    const repos = await getProjectRepositories(projectId)
    const isInternalRepoNameTaken = repos.find(repo => repo.internalRepoName === data.internalRepoName)
    if (isInternalRepoNameTaken) return sendBadRequest(res, `Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`)

    await lockProject(projectId)
    repo = await initializeRepository(data)

    addReqLogs({
      req,
      description: 'Dépôt créé avec succès',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
    sendCreated(res, repo)
  } catch (error) {
    const description = 'Echec de la création du dépôt'
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

    // TODO: Fix type
    // @ts-ignore See TODO
    const results = await hooksFns.createRepository(repoData)
    await addLogs('Create Repository', results, user.id)
    if (results.failed) throw new Error('Echec des services lors de la création du dépôt')
    isServicesCallOk = true
    addReqLogs({
      req,
      description: 'Dépôt créé avec succès par les plugins',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
  } catch (error) {
    const description = 'Echec de la création du dépôt par les plugins'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      await updateRepositoryCreated(repo.id)
      await unlockProjectIfNotFailed(projectId)
    } else {
      await updateRepositoryFailed(repo.id)
    }
    addReqLogs({
      req,
      description: 'Statut mis à jour après l\'appel aux plugins',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de mise à jour du statut après l\'appel aux plugins',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
      error,
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
    const project = await getProjectById(projectId)
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    if (data.isPrivate && !data.externalToken) throw new Error('Le token est requis')
    if (data.isPrivate && !data.externalUserName) throw new Error('Le nom d\'utilisateur est requis')

    repo = await getRepositoryById(repositoryId)
    if (!repo) throw new Error('Dépôt introuvable')

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    await lockProject(projectId)
    await updateRepository(repositoryId, data.info)

    repo = await getRepositoryById(repositoryId)
    const description = 'Dépôt mis à jour avec succès'

    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        repositoryId,
      },
    })
    sendOk(res, description)
  } catch (error) {
    const description = 'Echec de la mise à jour du dépôt'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        repositoryId,
      },
      error,
    })
    return sendBadRequest(res, description)
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

    // TODO: Fix type
    // @ts-ignore See TODO
    const results = await hooksFns.updateRepository(repoData)
    await addLogs('Update Repository', results, userId)
    if (results.failed) throw new Error('Echec des services associés au dépôt')
    isServicesCallOk = true
    addReqLogs({
      req,
      description: 'Dépôt mis à jour avec succès par les plugins',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
  } catch (error) {
    const description = 'Echec de la mise à jour du dépôt par les plugins'
    addReqLogs({
      req,
      description,
      extras: {
        repositoryId: repo.id,
      },
      error,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      await unlockProjectIfNotFailed(projectId)
    } else {
      await updateRepositoryFailed(repo.id)
    }

    addReqLogs({
      req,
      description: 'Statut mis à jour après l\'appel aux plugins',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
    return
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de mise à jour du statut après l\'appel aux plugins',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
      error,
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
    if (!repo) return sendNotFound(res, 'Dépôt introuvable')

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) return sendForbidden(res, 'Vous n\'êtes pas membre du projet')
    if (role.role !== 'owner') return sendForbidden(res, 'Vous n\'êtes pas souscripteur du projet')

    await lockProject(projectId)
    await updateRepositoryDeleting(repositoryId)

    const description = 'Dépôt en cours de suppression'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
    sendOk(res, description)
  } catch (error) {
    const description = 'Echec de la suppression du dépôt'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        repositoryId: repo.id,
      },
      error,
    })
    return sendBadRequest(res, description)
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
      internalUrl: `${gitlabUrl}/${projectRootDir}/${organization.name}/${project.name}/${repo.dataValues.internalRepoName}.git`,
    }

    // TODO: Fix type
    // @ts-ignore See TODO
    const results = await hooksFns.deleteRepository(repoData)
    await addLogs('Delete Repository', results, userId)
    if (results.failed) throw new Error('Echec des opérations')
    isServicesCallOk = true
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de la suppresion du dépôt par les plugins',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
      error,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      await deleteRepository(repositoryId)
      await unlockProjectIfNotFailed(projectId)
    } else {
      await updateRepositoryFailed(repo.id)
    }
    addReqLogs({
      req,
      description: 'Statut mis à jour après l\'appel aux plugins',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de mise à jour du statut après l\'appel aux plugins',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
      error,
    })
  }
}
