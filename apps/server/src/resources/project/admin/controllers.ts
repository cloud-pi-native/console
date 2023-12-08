import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getAllProjects } from './business.js'
import { RouteHandler } from 'fastify'
import { FastifyRequestWithSession } from '@/types/index.js'

export const getAllProjectsController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const allProjects = await getAllProjects()

  addReqLogs({
    req,
    description: 'Ensemble des projets récupérés avec succès',
  })
  return sendOk(res, allProjects)
}
