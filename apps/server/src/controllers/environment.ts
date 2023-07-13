import {
  updateEnvironmentCreated,
  updateEnvironmentFailed,
  updateEnvironmentDeleting,
  deleteEnvironment,
  getEnvironmentInfos,
  getClusterByEnvironmentId,
  getClustersByIds,
  getProjectInfos,
  lockProject,
  addLogs,
  getUserById,
  initializeEnvironment,
  getPublicClusters,
} from '@/queries/index.js'
import { addReqLogs } from '../utils/logger.js'
import {
  sendOk,
  sendCreated,
  sendNotFound,
  sendBadRequest,
  sendForbidden,
} from '../utils/response.js'
import {
  AsyncReturnType,
  filterOwners,
  hasPermissionInEnvironment,
  hasRoleInProject,
  unlockProjectIfNotFailed,
} from '../utils/controller.js'
import { hooks } from '../plugins/index.js'
import { gitlabUrl, harborUrl, projectRootDir } from '../utils/env.js'
import {
  type DeleteEnvironmentDto,
  type InitializeEnvironmentDto,
  type UpdateEnvironmentDto,
  projectIsLockedInfo,
} from 'shared'
import { EnhancedFastifyRequest } from '@/types/index.js'
import {
  addClustersToEnvironmentBusiness,
  removeClustersFromEnvironmentBusiness,
} from '@/business/environment.js'

// GET
export const getEnvironmentByIdController = async (req, res) => {
  const environmentId = req.params?.environmentId
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  try {
    // TODO : idée refacto : get env and includes permissions
    const env = await getEnvironmentInfos(environmentId)

    // bloc de contrôle
    const isProjectMember = await hasRoleInProject(userId, { roles: env.project.roles })
    if (!isProjectMember) throw new Error('Vous n\'êtes pas membre du projet')

    const isAllowed = await hasPermissionInEnvironment(userId, env.permissions, 3)
    if (!isAllowed) throw new Error('Vous n\'êtes pas souscripteur et n\'avez pas accès à cet environnement')
    delete env.project.roles

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
export const initializeEnvironmentController = async (req: EnhancedFastifyRequest<InitializeEnvironmentDto>, res) => {
  const data = req.body
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const newClustersId = req.body?.clustersId || []

  let env: AsyncReturnType<typeof initializeEnvironment>
  let project: AsyncReturnType<typeof getProjectInfos>
  let owner: AsyncReturnType<typeof getUserById>
  try {
    owner = await getUserById(userId)
    project = await getProjectInfos(projectId)

    // bloc de contrôle
    // TODO Joi validation
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    const isProjectOwner = await hasRoleInProject(userId, { roles: project.roles, minRole: 'owner' })
    if (!isProjectOwner) throw new Error('Vous n\'êtes pas souscripteur du projet')
    project.environments?.forEach(env => {
      if (env.name === data.name) return sendBadRequest(res, `L'environnement ${data.name} existe déjà pour ce projet`)
    })

    await lockProject(projectId)
    const projectOwners = filterOwners(project.roles)
    env = await initializeEnvironment({ projectId: project.id, name: data.name, projectOwners })

    addReqLogs({
      req,
      description: 'Environnement et permissions créés avec succès',
      extras: {
        environmentId: env.id,
        projectId,
      },
    })
    sendCreated(res, env)
  } catch (error) {
    const description = `Echec de la création de l'environnement : ${error.message}`
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
    const registryHost = harborUrl.split('//')[1].split('/')[0]
    const environmentName = env.name
    const projectName = project.name
    const organizationName = project.organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organizationName}/${projectName}`
    const repositories = env.project.repositories.map(({ internalRepoName }) => ({
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
    const results = await hooks.initializeEnvironment.execute(envData)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Create Environment', results, userId)
    if (results.failed) throw new Error('Echec services à la création de l\'environnement')
    await updateEnvironmentCreated(env.id)
    await unlockProjectIfNotFailed(projectId)
    // TODO
    const clusters = await getClustersByIds(newClustersId)
    await addClustersToEnvironmentBusiness(clusters, env.name, env.id, project.name, project.organization.name, userId, owner)
    addReqLogs({
      req,
      description: 'Environnement créé avec succès par les plugins',
      extras: {
        environmentId: env.id,
        projectId,
      },
    })
  } catch (error) {
    await updateEnvironmentFailed(env.id)
    addReqLogs({
      req,
      description: 'Echec de création de l\'environnement par les plugins',
      extras: {
        environmentId: env.id,
        projectId,
      },
      error,
    })
  }
}

export const updateEnvironmentController = async (req: EnhancedFastifyRequest<UpdateEnvironmentDto>, res) => {
  const { clustersId: newClustersId } = req.body
  const userId = req.session?.user?.id

  const { environmentId } = req.params

  let env: AsyncReturnType<typeof getEnvironmentInfos>
  try {
    env = await getEnvironmentInfos(environmentId)

    if (env.project.locked) return sendForbidden(res, projectIsLockedInfo)
    if (!await hasRoleInProject(userId, { minRole: 'owner', roles: env.project.roles })) return sendForbidden(res, 'Vous n\'êtes pas souscripteur du projet')
    const authorizedClusters = [...await getPublicClusters(), ...env.project.clusters]
    // si un des newClustersId n'est pas un cluster dans le projet
    if (newClustersId
      .some(newClusterId => !authorizedClusters
        .some(cluster => cluster.id === newClusterId))
    ) return sendForbidden(res, 'Ce cluster n\'est pas disponible sur pour ce projet')

    // First add environment on Clusters destinations
    const owner = env.project.roles[0].user
    const reallyNewClusters = await getClustersByIds(newClustersId.filter(newClusterId => !env.clusters.some(envCluster => envCluster.id === newClusterId)))
    await addClustersToEnvironmentBusiness(reallyNewClusters, env.name, env.id, env.project.name, env.project.organization.name, userId, owner)

    // Second remove from toRemoveClusters
    const toRemoveClusters = await getClustersByIds(
      env.clusters
        .filter(oldCluster => !newClustersId.includes(oldCluster.id))
        .map(({ id }) => id),
    )
    await removeClustersFromEnvironmentBusiness(toRemoveClusters, env.name, env.id, env.project.name, env.project.organization.name, userId)

    await updateEnvironmentCreated(env.id)
    await unlockProjectIfNotFailed(env.project.id)
    addReqLogs({
      req,
      description: 'Environnement mise à jour',
      extras: {
        environmentId,
        projectId: env.project.id,
      },
    })
  } catch (error) {
    await updateEnvironmentCreated(env.id)
    await unlockProjectIfNotFailed(env.project.id)
    const description = 'Echec de la mise à jour de l\'environnement'
    addReqLogs({
      req,
      description,
      extras: {
        environmentId: env.id,
        projectId: env.project.id,
      },
      error,
    })
    return sendBadRequest(res, description)
  }
}

// DELETE
export const deleteEnvironmentController = async (req: EnhancedFastifyRequest<DeleteEnvironmentDto>, res) => {
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  let env: AsyncReturnType<typeof getEnvironmentInfos>
  try {
    env = await getEnvironmentInfos(environmentId)

    const isProjectOwner = await hasRoleInProject(userId, { roles: env.project.roles, minRole: 'owner' })
    if (!isProjectOwner) return sendForbidden(res, 'Vous n\'êtes pas souscripteur du projet')

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
    return sendBadRequest(res, description)
  }

  try {
    const environmentName = env.name
    const projectName = env.project.name
    const organizationName = env.project.organization.name
    const gitlabBaseURL = `${gitlabUrl}/${projectRootDir}/${organizationName}/${projectName}`
    const repositories = env.project.repositories.map(({ internalRepoName }) => ({
      url: `${gitlabBaseURL}/${internalRepoName}.git`,
      internalRepoName,
    }))
    const clusters = await getClusterByEnvironmentId(env.id)

    const envData = {
      environment: environmentName,
      project: projectName,
      organization: organizationName,
      repositories,
      clusters,
    }
    // TODO: Fix type
    const results = await hooks.deleteEnvironment.execute(envData)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    // await addLogs('Delete Environment', results, userId)
    if (results.failed) throw new Error('Echec des services à la suppression de l\'environnement')
    await deleteEnvironment(environmentId)
    await unlockProjectIfNotFailed(projectId)
    addReqLogs({
      req,
      description: 'Environnement supprimé avec succès',
      extras: {
        environmentId,
        projectId,
      },
    })
  } catch (error) {
    await updateEnvironmentFailed(environmentId)
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
}
