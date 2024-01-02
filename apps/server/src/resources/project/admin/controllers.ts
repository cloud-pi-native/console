import { addReqLogs } from '@/utils/logger.js'
import { FastifyRequest, type FastifyInstance } from 'fastify'
import { sendNoContent, sendOk } from '@/utils/response.js'
import { getAllProjects, handleProjectLocking, generateProjectsData } from './business.js'

import { getAllProjectsSchema, patchProjectSchema, generateProjectsDataSchema } from '@dso-console/shared'
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

  // Récupérer les données de tous les projets pour export
  app.get('/data',
    {
      schema: generateProjectsDataSchema,
    },
    async (req: FastifyRequest, res) => {
      const generatedProjectsData = await generateProjectsData()

      addReqLogs({
        req,
        description: 'Données des projets rassemblées pour export',
      })
      return sendOk(res, generatedProjectsData)
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
