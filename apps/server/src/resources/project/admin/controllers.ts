import { addReqLogs } from '@/utils/logger.js'
import { type RouteHandler } from 'fastify'
import { type FastifyRequestWithSession } from '@/types/index.js'
import { sendNoContent, sendOk } from '@/utils/response.js'
import { getAllProjects, handleProjectLocking } from './business.js'

// GET
export const getAllProjectsController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const allProjects = await getAllProjects()

  addReqLogs({
    req,
    description: 'Ensemble des projets récupérés avec succès',
  })
  return sendOk(res, allProjects)
}

// PATCH
export const handleProjectLockingController = async (req, res) => {
  const projectId = req.params.projectId
  const lock = req.body.lock

  await handleProjectLocking(projectId, lock)

  addReqLogs({
    req,
    description: `Projet ${lock ? 'verrouillé' : 'déverrouillé'} avec succès`,
  })
  return sendNoContent(res)
}
