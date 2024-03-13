import { addReqLogs } from '@/utils/logger.js'
import {
  sendOk,
  sendCreated,
  sendNoContent,
} from '@/utils/response.js'
import { initializeEnvironmentSchema, updateEnvironmentSchema, deleteEnvironmentSchema } from '@cpn-console/shared'
import {
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from './business.js'
import type { FastifyInstance } from 'fastify'

import { FromSchema } from 'json-schema-to-ts'

const router = async (app: FastifyInstance, _opt) => {
  // Créer un environnement
  app.post<{
    Body: FromSchema<typeof initializeEnvironmentSchema['body']>,
    Params: FromSchema<typeof initializeEnvironmentSchema['params']>,
  }>('/:projectId/environments',
    {
      schema: initializeEnvironmentSchema,
    },
    async (req, res) => {
      const data = req.body
      const userId = req.session.user.id
      const projectId = req.params.projectId

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
        description: 'Environnement et permissions créés avec succès',
        extras: {
          environmentId: environment.id,
          projectId,
        },
      })

      sendCreated(res, environment)
    })

  // Mettre à jour un environnement
  app.put<{
    Body: FromSchema<typeof updateEnvironmentSchema['body']>,
    Params: FromSchema<typeof updateEnvironmentSchema['params']>,
  }>('/:projectId/environments/:environmentId',
    {
      schema: updateEnvironmentSchema,
    },
    async (req, res) => {
      const data = req.body
      const user = req.session.user
      const { projectId, environmentId } = req.params

      const environment = await updateEnvironment({
        user,
        projectId,
        environmentId,
        quotaStageId: data.quotaStageId,
        clusterId: data.clusterId,
        requestId: req.id,
      })

      if (environment) {
        addReqLogs({
          req,
          description: 'Environnement mis à jour avec succès',
          extras: {
            environmentId,
            projectId: environment.projectId,
          },
        })
        sendOk(res, environment)
      }
    })

  // Supprimer un environnement
  app.delete<{
    Params: FromSchema<typeof deleteEnvironmentSchema['params']>,
  }>('/:projectId/environments/:environmentId',
    {
      schema: deleteEnvironmentSchema,
    },
    async (req, res) => {
      const environmentId = req.params.environmentId
      const projectId = req.params.projectId
      const userId = req.session.user.id

      await deleteEnvironment({
        userId,
        projectId,
        environmentId,
        requestId: req.id,
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
    },
  )
}

export default router
