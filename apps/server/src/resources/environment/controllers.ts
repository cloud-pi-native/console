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
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  checkGetEnvironment,
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

  const environment = await createEnvironment({
    userId,
    projectId,
    name: data.name,
    clusterId: data.clusterId,
    quotaStageId: data.quotaStageId,
  })

  addReqLogs({
    req,
    description: 'Environnement et permissions créés avec succès',
    extras: {
      environmentId: environment.id,
      projectId,
    },
  })

  sendCreated(res, environment)
}

export const updateEnvironmentController = async (req: EnhancedFastifyRequest<UpdateEnvironmentDto>, res) => {
  const data = req.body
  const userId = req.session?.user?.id
  const { projectId, environmentId } = req.params

  const environment = await updateEnvironment({
    userId,
    projectId,
    environmentId,
    quotaStageId: data.quotaStageId,
  })

  addReqLogs({
    req,
    description: 'Environnement mis à jour avec succès',
    extras: {
      environmentId,
      projectId: environment.project.id,
    },
  })

  sendOk(res, environment)
}

// DELETE
export const deleteEnvironmentController = async (req: EnhancedFastifyRequest<DeleteEnvironmentDto>, res) => {
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  await deleteEnvironment({
    userId,
    projectId,
    environmentId,
  })

  addReqLogs({
    req,
    description: 'Environnement supprimé avec succès',
    extras: {
      environmentId,
      projectId,
    },
  })

  sendNoContent(res)
}
