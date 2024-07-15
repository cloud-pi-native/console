import { stageContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { addReqLogs } from '@/utils/logger.js'
import {
  listStages,
  createStage,
  getStageAssociatedEnvironments,
  deleteStage,
  updateStage,
} from './business.js'
import { assertIsAdmin } from '@/utils/controller.js'

export const stageRouter = () => serverInstance.router(stageContract, {

  // Récupérer les types d'environnement disponibles
  listStages: async ({ request: req }) => {
    const userId = req.session.user.id
    const stages = await listStages(userId)

    addReqLogs({
      req,
      message: 'Stages récupérés avec succès',
    })
    return {
      status: 200,
      body: stages,
    }
  },

  // Récupérer les environnements associés au stage
  getStageEnvironments: async ({ request: req, params }) => {
    const stageId = params.stageId

    assertIsAdmin(req.session.user)
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
    assertIsAdmin(req.session.user)
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

    assertIsAdmin(req.session.user)
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

    assertIsAdmin(req.session.user)
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
