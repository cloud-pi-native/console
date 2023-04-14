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
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'
import hooksFns from '../plugins/index.js'
import { addLogs } from '../models/queries/log-queries.js'
import { getOrganizationById } from '../models/queries/organization-queries.js'
import { getInfraProjectRepositories } from '../models/queries/repository-queries.js'
import { gitlabUrl, harborUrl, projectPath } from '../utils/env.js'

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

    req.log.info({
      ...getLogInfos({
        environmentId: env.id,
      }),
      description: 'Environment successfully retrieved',
    })
    send200(res, env)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Environnement non trouvé: ${error.message}`,
      error: error.message,
      trace: error.trace,
    })
    return send500(res, error.message)
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

    req.log.info({
      ...getLogInfos({
        projectId: project.id,
      }),
      description: 'Environment successfully created in database',
    })
    send201(res, env)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Environnement non créé',
      error: error.message,
      trace: error.trace,
    })
    return send500(res, error.message)
  }

  // Process api call to external service
  let isServicesCallOk
  try {
    const registryHost = harborUrl.split('//')[1].split('/')[0]
    const environmentName = env.dataValues.name
    const projectName = project.dataValues.name
    const organizationName = organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectPath.join('/')}/${organizationName}/${projectName}/`
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
    }
    const results = await hooksFns.initializeEnvironment(envData)
    await addLogs('Create Environment', results, userId)
    if (results.failed) throw new Error('Echec services à la création de l\'environnement')

    isServicesCallOk = true
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Echec requête ${req.id} : ${error.message}`,
      error: JSON.stringify(error),
      trace: error.trace,
    })
    isServicesCallOk = false
  }

  // Update DB after service call
  try {
    if (isServicesCallOk) {
      await updateEnvironmentCreated(env.id)
      const ownerId = await getSingleOwnerByProjectId(projectId)
      if (ownerId !== userId) {
        await setPermission({
          userId: ownerId,
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

    req.log.info({
      ...getLogInfos({ projectId: env.id }),
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

    req.log.info({
      ...getLogInfos({
        projectId,
      }),
      description: 'Environment status successfully updated in database',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update environment status',
      error: error.message,
      trace: error.trace,
    })
    return send500(res, error.message)
  }

  try {
    const environmentName = env.name
    const projectName = project.name
    const organizationName = organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectPath.join('/')}/${organizationName}/${projectName}/`
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

    req.log.info({
      ...getLogInfos({ environmentId }),
      description: 'Environment successfully deleted',
    })
    return
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot delete environment',
      error: JSON.stringify(error),
      trace: error.trace,
    })
  }

  try {
    await updateEnvironmentFailed(environmentId)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ environmentId }),
      description: 'Environment status successfully updated to failed in database',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update environment status to failed',
      error: error.message,
      trace: error.trace,
    })
  }
}
