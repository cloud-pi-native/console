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
  let projectEnvs
  try {
    const project = await getProjectById(projectId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')
    // TODO : plus tard il sera nécessaire d'être owner pour créer un environment
    // if (role.role !== 'owner') throw new Error('Vous n\'êtes pas souscripteur du projet')

    projectEnvs = await getEnvironmentsByProjectId(projectId)
    projectEnvs?.forEach(env => {
      if (env.name === data.name) throw new Error('Requested environment already exists for this project')
    })

    env = await initializeEnvironment(data)
    await lockProject(projectId)
    projectEnvs = await getEnvironmentsByProjectId(projectId)

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

  // TODO : #133 : appel ansible + création groupe keycloak + ajout owner au groupe keycloak
  try {
    // TODO : #133 : appel ansible + création groupe keycloak + ajout owner au groupe keycloak

    // TODO : en attente déploiement canel

    const canelData = {
      applications: {
        uuid: projectId,
        canel_id: projectId,
        environnements: projectEnvs,
      },
    }

    console.log(canelData.applications)

    const canelRes = await fetch('https://qualification.ines-api.dsic.minint.fr/canel/api/v1/applications', {
      method: 'PUT',
      body: JSON.stringify(canelData),
    })

    const canelJson = await canelRes.json()

    console.log({ canelJson })

    if (canelJson.code !== 200) throw new Error(`Echec de maj du projet côté canel : ${canelJson.description}`)
    try {
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

    req.log.info({
      ...getLogInfos({ projectId: env.id }),
      description: 'Environment status successfully updated to created in database',
    })
    return
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update environment status to created',
      error: error.message,
      trace: error.trace,
    })
  }

  try {
    await updateEnvironmentFailed(env.id)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ projectId: env.id }),
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

// DELETE
export const deleteEnvironmentController = async (req, res) => {
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  let projectEnvs
  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')
    if (role.role !== 'owner') throw new Error('Vous n\'êtes pas souscripteur du projet')

    await updateEnvironmentDeleting(environmentId)
    await lockProject(projectId)

    projectEnvs = await getEnvironmentsByProjectId(projectId)
    projectEnvs.splice(
      projectEnvs.findIndex(environment => environment.id === environmentId),
      1,
    )

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

  // TODO : #133 : appel ansible + suppression groupe keycloak (+ retirer users du groupe keycloak ?)
  try {
    // TODO : #133 : appel ansible + suppression groupe keycloak (+ retirer users du groupe keycloak ?)

    // TODO : en attente déploiement canel

    const canelData = {
      applications: {
        uuid: projectId,
        canel_id: projectId,
        environnements: projectEnvs,
      },
    }

    console.log(canelData.applications)

    const canelRes = await fetch('https://qualification.ines-api.dsic.minint.fr/canel/api/v1/applications', {
      method: 'PUT',
      body: JSON.stringify(canelData),
    })

    const canelJson = await canelRes.json()

    console.log({ canelJson })

    if (canelJson.code !== 200) throw new Error(`Echec de maj du projet côté canel : ${canelJson.description}`)
    try {
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
      error: error.message,
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
