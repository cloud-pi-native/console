import { addReqLogs } from '@/utils/logger.js'
import {
  sendOk,
  sendCreated,
  sendNoContent,
} from '@/utils/response.js'
import {
  type DeleteEnvironmentDto,
  type InitializeEnvironmentDto,
  type UpdateEnvironmentDto,
} from '@dso-console/shared'
import { EnhancedFastifyRequest } from '@/types/index.js'
import {
  getEnvironmentInfos,
  getEnvironmentInfosAndClusters,
  checkCreateEnvironment,
  checkUpdateEnvironment,
  checkDeleteEnvironment,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  checkGetEnvironment,
  getInitializeEnvironmentInfos,
} from './business.js'

// GET
// TODO #541 : ce controller n'est pas utilisé
export const getEnvironmentByIdController = async (req, res) => {
  const environmentId = req.params?.environmentId
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  // appel business 1 : récup données
  const env = await getEnvironmentInfos(environmentId)

  // appel business 2 : check pré-requis
  checkGetEnvironment(env, userId)

  // Nettoyage des clés
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
}

// POST
export const initializeEnvironmentController = async (req: EnhancedFastifyRequest<InitializeEnvironmentDto>, res) => {
  const data = req.body
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const newClustersId = req.body?.clustersId || []

  // appel business 1 : récup données
  const { owner, project, authorizedClusters } = await getInitializeEnvironmentInfos(userId, projectId)

  // appel business 2 : check pré-requis
  checkCreateEnvironment({
    project,
    authorizedClusters,
    userId,
    newClustersId,
    // @ts-ignore
    envName: data.name,
  })

  // TODO Joi

  // appel business 3 : create
  const env = await createEnvironment(
    project,
    owner,
    userId,
    // @ts-ignore
    data.name,
    newClustersId,
  )

  addReqLogs({
    req,
    description: 'Environnement et permissions créés avec succès',
    extras: {
      environmentId: env.id,
      projectId,
    },
  })
  sendCreated(res, env)
}

export const updateEnvironmentController = async (req: EnhancedFastifyRequest<UpdateEnvironmentDto>, res) => {
  const { clustersId: newClustersId } = req.body
  const userId = req.session?.user?.id
  const { environmentId } = req.params

  // appel business 1 : récup données
  const { env, authorizedClusters } = await getEnvironmentInfosAndClusters(environmentId)
  // appel business 2 : check pré-requis
  checkUpdateEnvironment(
    {
      locked: env.project.locked,
      roles: env.project.roles,
      id: env.project.id,
    },
    authorizedClusters,
    userId,
    newClustersId,
  )

  // appel business 3 : update
  await updateEnvironment(env, userId, newClustersId)
  addReqLogs({
    req,
    description: 'Environnement mis à jour avec succès',
    extras: {
      environmentId,
      projectId: env.project.id,
    },
  })

  const envUpdated = await getEnvironmentInfos(environmentId)
  sendOk(res, envUpdated)
}

// DELETE
export const deleteEnvironmentController = async (req: EnhancedFastifyRequest<DeleteEnvironmentDto>, res) => {
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  // appel business 1 : récup données
  const env = await getEnvironmentInfos(environmentId)
  // appel business 2 : check pré-requis
  checkDeleteEnvironment(
    {
      locked: env.project.locked,
      roles: env.project.roles,
      id: env.project.id,
    },
    userId,
  )

  // appel business 3 : update
  await deleteEnvironment(env, userId)
  addReqLogs({
    req,
    description: 'Statut de l\'environnement mis à jour avec succès, environnement en cours de suppression',
    extras: {
      environmentId,
      projectId,
    },
  })
  sendNoContent(res)
}
