import { addReqLogs } from '@/utils/logger.js'
import { sendCreated, sendNoContent, sendOk } from '@/utils/response.js'
import {
  checkClusterProjectIds,
  createCluster,
  updateCluster,
  getClusterAssociatedEnvironments,
  deleteCluster,
} from './business.js'
import type { FastifyInstance } from 'fastify'

import { createClusterSchema, getClusterAssociatedEnvironmentsSchema, updateClusterSchema, deleteClusterSchema } from '@dso-console/shared'
import { FromSchema } from 'json-schema-to-ts'
import '@/types/index.js'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les environnements associés au cluster
  app.get<{
    Params: FromSchema<typeof getClusterAssociatedEnvironmentsSchema['params']>,
  }>('/:clusterId/environments',
    {
      schema: getClusterAssociatedEnvironmentsSchema,
    },
    async (req, res) => {
      const clusterId = req.params.clusterId
      const environments = await getClusterAssociatedEnvironments(clusterId)

      addReqLogs({
        req,
        description: 'Environnements associés au cluster récupérés',
        extras: {
          clusterId,
        },
      })

      sendOk(res, environments)
    })

  // Déclarer un nouveau cluster
  app.post<{
    Body: FromSchema<typeof createClusterSchema['body']>
  }>('/',
    {
      schema: createClusterSchema,
    },
    async (req, res) => {
      const data = req.body
      const userId = req.session.user.id

      data.projectIds = checkClusterProjectIds(data)

      const cluster = await createCluster(data, userId, req.id)

      addReqLogs({
        req,
        description: 'Cluster créé avec succès',
        extras: {
          clusterId: cluster.id,
        },
      })
      sendCreated(res, cluster)
    })

  // Mettre à jour un cluster
  app.put<{
    Params: FromSchema<typeof updateClusterSchema['params']>,
    Body: FromSchema<typeof updateClusterSchema['body']>,
  }>('/:clusterId',
    {
      schema: updateClusterSchema,
    },
    async (req, res) => {
      const data = req.body
      const userId = req.session.user.id
      const clusterId = req.params.clusterId

      const cluster = await updateCluster(data, clusterId, userId, req.id)

      addReqLogs({
        req,
        description: 'Cluster mis à jour avec succès',
        extras: {
          clusterId: cluster.id,
        },
      })
      sendOk(res, cluster)
    })

  // DELETE
  // Supprimer un cluster
  app.delete<{
    Params: FromSchema<typeof deleteClusterSchema['params']>
  }>('/:clusterId',
    {
      schema: deleteClusterSchema,
    },
    async (req, res) => {
      const clusterId = req.params.clusterId
      const userId = req.session.user.id

      await deleteCluster(clusterId, userId, req.id)

      addReqLogs({
        req,
        description: 'Cluster supprimé avec succès',
        extras: {
          clusterId,
        },
      })
      sendNoContent(res)
    })
}

export default router
