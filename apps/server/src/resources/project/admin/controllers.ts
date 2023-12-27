import { addReqLogs } from '@/utils/logger.js'
import { FastifyRequest, type FastifyInstance } from 'fastify'
import { sendNoContent, sendOk } from '@/utils/response.js'
import { getAllProjects, handleProjectLocking } from './business.js'

import { getAllProjectsSchema, patchProjectSchema } from '@dso-console/shared'
import { FromSchema } from 'json-schema-to-ts'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer tous les projets
  app.get('/',
    {
      schema: getAllProjectsSchema,
    },
    async (req: FastifyRequest, res) => {
      const allProjects = await getAllProjects()

      addReqLogs({
        req,
        description: 'Ensemble des projets récupérés avec succès',
      })
      return sendOk(res, allProjects)
    })

  // (Dé)verrouiller un projet
  app.patch<{
    Params: FromSchema<typeof patchProjectSchema['params']>
    Body: FromSchema<typeof patchProjectSchema['body']>
  }>('/:projectId',
    {
      schema: patchProjectSchema,
    },
    async (req, res) => {
      const projectId = req.params.projectId
      const lock = req.body.lock

      await handleProjectLocking(projectId, lock)

      addReqLogs({
        req,
        description: `Projet ${lock ? 'verrouillé' : 'déverrouillé'} avec succès`,
      })
      return sendNoContent(res)
    })
}

export default router
