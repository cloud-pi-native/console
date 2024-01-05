import { addReqLogs } from '@/utils/logger.js'
import {
  sendOk,
  sendCreated,
  sendNoContent,
} from '@/utils/response.js'
import {
  getEnvironmentByIdSchema, initializeEnvironmentSchema, updateEnvironmentSchema, deleteEnvironmentSchema,
} from '@dso-console/shared'
import {
  getEnvironmentInfos,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  checkGetEnvironment,
} from './business.js'
import type { FastifyInstance } from 'fastify'

import { FromSchema } from 'json-schema-to-ts'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer un environnement par son id
  // TODO #541 : ce controller n'est pas utilisé
  app.get<{
    Params: FromSchema<typeof getEnvironmentByIdSchema['params']>,
  }>('/:projectId/environments/:environmentId',
    {
      schema: getEnvironmentByIdSchema,
    },
    async (req, res) => {
      const environmentId = req.params.environmentId
      const userId = req.session.user.id
      const projectId = req.params.projectId

      // appel business 1 : récup données
      const env = await getEnvironmentInfos(environmentId)

      // appel business 2 : check pré-requis
      checkGetEnvironment(env, userId)

      // Nettoyage des clés
      delete env.project.roles

      addReqLogs({
        req,
        description: 'Environnement récupéré avec succès',
        extras: {
          environmentId,
          projectId,
        },
      })
      sendOk(res, env)
    })

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
      })

      addReqLogs({
        req,
        description: 'Environnement mis à jour avec succès',
        extras: {
          environmentId,
          projectId: environment.projectId,
        },
      })

      sendOk(res, environment)
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
