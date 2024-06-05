import { serverInstance } from '@/app.js'
import { environmentContract } from '@cpn-console/shared'
import { createEnvironment, deleteEnvironment, updateEnvironment } from './business.js'
import { addReqLogs } from '@/utils/logger.js'

export const environmentRouter = () => serverInstance.router(environmentContract, {
  createEnvironment: async ({ request: req, body: data, params }) => {
    const userId = req.session.user.id
    const projectId = params.projectId

    const environment = await createEnvironment({
      userId,
      projectId,
      name: data.name,
      clusterId: data.clusterId,
      quotaStageId: data.quotaStageId,
      requestId: req.id,
    })

    addReqLogs({
      req,
      message: 'Environnement et permissions créés avec succès',
      infos: {
        environmentId: environment.id,
        projectId,
      },
    })

    return {
      status: 201,
      body: environment,
    }
  },

  updateEnvironment: async ({ request: req, body: data, params }) => {
    const user = req.session.user
    const { projectId, environmentId } = params

    const environment = await updateEnvironment({
      user,
      projectId,
      environmentId,
      quotaStageId: data.quotaStageId,
      clusterId: data.clusterId,
      requestId: req.id,
    })

    addReqLogs({
      req,
      message: 'Environnement mis à jour avec succès',
      infos: {
        environmentId,
        projectId: environment.projectId,
      },
    })
    return {
      status: 200,
      body: environment,
    }
  },

  deleteEnvironment: async ({ request: req, params }) => {
    const { projectId, environmentId } = params
    const userId = req.session.user.id

    await deleteEnvironment({
      userId,
      projectId,
      environmentId,
      requestId: req.id,
    })

    addReqLogs({
      req,
      message: 'Environnement supprimé avec succès',
      infos: {
        environmentId,
        projectId,
      },
    })

    return {
      status: 204,
      body: null,
    }
  },
})
