import { addReqLogs } from '@/utils/logger.js'
import {
  createStage,
  getStageAssociatedEnvironments,
  deleteStage,
  updateStage,
} from './business.js'
import {
  stageAdminContract,
} from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export const stageAdminRouter = () => serverInstance.router(stageAdminContract, {

  // Récupérer les environnements associés au stage
  getStageEnvironments: async ({ request: req, params }) => {
    const stageId = params.stageId

    const environments = await getStageAssociatedEnvironments(stageId)

    addReqLogs({
      req,
      message: 'Environnements associés au type d\'environnement récupérés',
      infos: {
        stageId,
      },
    })

    return {
      status: 200,
      body: environments,
    }
  },

  // Créer un stage
  createStage: async ({ request: req, body: data }) => {
    const stage = await createStage(data)

    addReqLogs({
      req,
      message: 'Type d\'environnement créé avec succès',
      infos: {
        stageId: stage.id,
      },
    })

    return {
      status: 201,
      body: stage,
    }
  },

  // Modifier une association stage / clusters
  updateStage: async ({ request: req, params, body: data }) => {
    const stageId = params.stageId

    const stage = await updateStage(stageId, data)

    addReqLogs({
      req,
      message: 'Clusters associés au type d\'environnement mis à jour avec succès',
      infos: {
        stageId,
      },
    })

    return {
      status: 200,
      body: stage,
    }
  },

  // Supprimer un stage
  deleteStage: async ({ request: req, params }) => {
    const stageId = params.stageId

    await deleteStage(stageId)

    addReqLogs({
      req,
      message: 'Type d\'environnement supprimé avec succès',
      infos: {
        stageId,
      },
    })

    return {
      status: 204,
      body: null,
    }
  },
})
