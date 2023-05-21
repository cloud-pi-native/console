import {
  getEnvironmentById,
  initializeEnvironment,
  getEnvironmentsByProjectId,
  updateEnvironmentCreated,
  updateEnvironmentFailed,
  updateEnvironmentDeleting,
  deleteEnvironment,
} from '../models/queries/environment-queries.js'
import {
  setPermission,
  getPermissionByUserIdAndEnvironmentId,
} from '../models/queries/permission-queries.js'
import { getProjectById, lockProject, unlockProject } from '../models/queries/project-queries.js'
import {
  getRoleByUserIdAndProjectId,
  getSingleOwnerByProjectId,
} from '../models/queries/users-projects-queries.js'
import { addReqLogs } from '../utils/logger.js'
import { sendOk, sendCreated, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
import hooksFns from '../plugins/index.js'
import { addLogs } from '../models/queries/log-queries.js'
import { getOrganizationById } from '../models/queries/organization-queries.js'
import { getInfraProjectRepositories } from '../models/queries/repository-queries.js'
import { gitlabUrl, harborUrl, projectRootDir } from '../utils/env.js'

// GET
export const getEnvironmentByIdController = async (req, res) => {
  const environmentId = req.params?.environmentId
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  try {
    // TODO : idée refacto : get env and includes permissions
    const env = await getEnvironmentById(environmentId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    const userPermissionLevel = await getPermissionByUserIdAndEnvironmentId(userId, environmentId)

    if (!role) throw new Error('Vous n\'êtes pas membre du projet')
    if (role.role !== 'owner' && !userPermissionLevel) throw new Error('Vous n\'êtes pas souscripteur et n\'avez pas accès à cet environnement')

    addReqLogs({
      req,
      description: 'Environnement récupéré avec succès',
      extras: {
        environmentId,
        projectId,
      },
    })
    sendOk(res, env)
  } catch (error) {
    const description = 'Echec de la récupération de l\'environnement'
    addReqLogs({
      req,
      description,
      extras: {
        environmentId,
        projectId,
      },
      error,
    })
    return sendNotFound(res, description)
  }
}

// POST
export const initializeEnvironmentController = async (req, res) => {
  const data = req.body
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  let env
  let project
  let organization
  let owner
  try {
    project = await getProjectById(projectId)
    organization = await getOrganizationById(project.organization)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')
    // TODO : plus tard il sera nécessaire d'être owner pour créer un environment
    // if (role.role !== 'owner') throw new Error('Vous n\'êtes pas souscripteur du projet')

    const projectEnvs = await getEnvironmentsByProjectId(projectId)
    projectEnvs?.forEach(env => {
      if (env.name === data.name) throw new Error('Requested environment already exists for this project')
    })

    env = await initializeEnvironment(data)
    await lockProject(projectId)
    owner = await getSingleOwnerByProjectId(projectId)

    addReqLogs({
      req,
      description: 'Environnement créé avec succès',
      extras: {
        environmentId: env.id,
        projectId,
      },
    })
    sendCreated(res, env)
  } catch (error) {
    const description = 'Echec de la création de l\'environnement'
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
    const registryHost = harborUrl.split('//')[1].split('/')[0]
    const environmentName = env.dataValues.name
    const projectName = project.dataValues.name
    const organizationName = organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organizationName}/${projectName}/`
    const repositories = (await getInfraProjectRepositories(project.id)).map(({ internalRepoName }) => ({
      url: `${gitlabBaseURL}/${internalRepoName}.git`,
      internalRepoName,
    }))

    const envData = {
      environment: environmentName,
      project: projectName,
      organization: organizationName,
      repositories,
      registryHost,
      owner,
    }
    const results = await hooksFns.initializeEnvironment(envData)
    await addLogs('Create Environment', results, userId)
    if (results.failed) throw new Error('Echec services à la création de l\'environnement')
    isServicesCallOk = true
    addReqLogs({
      req,
      description: 'Environnement créé avec succès par les plugins',
      extras: {
        environmentId: env.id,
        projectId,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de création de l\'environnement par les plugins',
      extras: {
        environmentId: env.id,
        projectId,
      },
      error,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      await updateEnvironmentCreated(env.id)
      const owner = await getSingleOwnerByProjectId(projectId)
      if (owner.id !== userId) {
        await setPermission({
          userId: owner.id,
          environmentId: env.id,
          level: 2,
        })
      }
      await setPermission({
        userId,
        environmentId: env.id,
        level: 2,
      })
      await unlockProject(projectId)
    } else {
      await updateEnvironmentFailed(env.id)
    }
    await unlockProject(projectId)

    addReqLogs({
      req,
      description: 'Projet dévérouillé avec succès après la création de l\'environnement',
      extras: {
        environmentId: env.id,
        projectId,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec du déverrouillage du projet après la création de l\'environnement',
      extras: {
        environmentId: env.id,
        projectId,
      },
      error,
    })
  }
}

// DELETE
export const deleteEnvironmentController = async (req, res) => {
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  let env
  let project
  let organization
  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')
    if (role.role !== 'owner') throw new Error('Vous n\'êtes pas souscripteur du projet')

    env = await getEnvironmentById(environmentId)
    project = await getProjectById(projectId)
    organization = await getOrganizationById(project.organization)

    await updateEnvironmentDeleting(environmentId)
    await lockProject(projectId)

    addReqLogs({
      req,
      description: 'Statut de l\'environnement mis à jour avec succès, environnement en cours de suppression',
      extras: {
        environmentId,
        projectId,
      },
    })
  } catch (error) {
    const description = 'Echec de la suppression de l\'environnement'
    addReqLogs({
      req,
      description,
      extras: {
        environmentId,
        projectId,
      },
      error,
    })
    return sendForbidden(res, description)
  }

  try {
    const environmentName = env.name
    const projectName = project.name
    const organizationName = organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organizationName}/${projectName}/`
    const repositories = (await getInfraProjectRepositories(project.id)).map(({ internalRepoName }) => ({
      url: `${gitlabBaseURL}/${internalRepoName}.git`,
      internalRepoName,
    }))

    const envData = {
      environment: environmentName,
      project: projectName,
      organization: organizationName,
      repositories,
    }
    const results = await hooksFns.deleteEnvironment(envData)
    await addLogs('Delete Environment', results, userId)
    if (results.failed) throw new Error('Echec des services à la suppression de l\'environnement')
    await deleteEnvironment(environmentId)
    await unlockProject(projectId)

    addReqLogs({
      req,
      description: 'Environnement supprimé avec succès',
      extras: {
        environmentId,
        projectId,
      },
    })
    return
  } catch (error) {
    addReqLogs({
      req,
      description: 'Erreur de la suppression de l\'environnement',
      extras: {
        environmentId,
        projectId,
      },
      error,
    })
  }

  try {
    await updateEnvironmentFailed(environmentId)
    await unlockProject(projectId)

    addReqLogs({
      req,
      description: 'Statut de l\'environnement mis à jour avec succès, échec de la suppression de l\'environnement',
      extras: {
        environmentId,
        projectId,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec de la mise à jour de l\'environnement',
      extras: {
        environmentId,
        projectId,
      },
      error,
    })
  }
}
