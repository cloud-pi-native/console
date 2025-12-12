import { AdminAuthorized, stageContract } from '@cpn-console/shared'
import {
  createStage,
  deleteStage,
  getStageAssociatedEnvironments,
  listStages,
  updateStage,
} from './business'
import { serverInstance } from '@old-server/app'

import { authUser } from '@old-server/utils/controller'
import { ErrorResType, Forbidden403 } from '@old-server/utils/errors'

export function stageRouter() {
  return serverInstance.router(stageContract, {

    // Récupérer les types d'environnement disponibles
    listStages: async () => {
      const body = await listStages()

      return {
        status: 200,
        body,
      }
    },

    // Récupérer les environnements associés au stage
    getStageEnvironments: async ({ request: req, params }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const stageId = params.stageId
      const body = await getStageAssociatedEnvironments(stageId)
      if (body instanceof ErrorResType) return body

      return {
        status: 200,
        body,
      }
    },

    // Créer un stage
    createStage: async ({ request: req, body: data }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const body = await createStage(data)
      if (body instanceof ErrorResType) return body

      return {
        status: 201,
        body,
      }
    },

    // Modifier une association stage / clusters
    updateStage: async ({ request: req, params, body: data }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const stageId = params.stageId

      const body = await updateStage(stageId, data)
      if (body instanceof ErrorResType) return body

      return {
        status: 200,
        body,
      }
    },

    // Supprimer un stage
    deleteStage: async ({ request: req, params }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const stageId = params.stageId

      const body = await deleteStage(stageId)
      if (body instanceof ErrorResType) return body

      return {
        status: 204,
        body,
      }
    },
  })
}
