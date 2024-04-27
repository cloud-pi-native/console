import { addReqLogs } from '@/utils/logger.js'
import { projectServiceContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { getProjectServices, updateProjectServices } from './business.js'

export const projectServiceRouter = () => serverInstance.router(projectServiceContract, {
  // Récupérer les services d'un projet
  getServices: async ({ request: req, params: { projectId } }) => {
    const requestor = req.session.user
    const services = await getProjectServices(projectId, requestor)
    addReqLogs({
      req,
      message: 'Services de projet récupérés avec succès',
      infos: {
        userId: requestor.id,
      },
    })
    return {
      status: 200,
      body: services,
    }
  },
  updateProjectServices: async ({ request: req, params: { projectId }, body }) => {
    const user = req.session.user

    await updateProjectServices(projectId, body, user)
    return {
      status: 204,
      body: null,
    }
  },
})
