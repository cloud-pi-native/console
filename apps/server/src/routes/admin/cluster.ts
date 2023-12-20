import {
  getClusterAssociatedEnvironmentsController,
  createClusterController,
  updateClusterController,
  deleteClusterController,
} from '@/resources/cluster/admin/controllers.js'
import { createClusterSchema, getClusterAssociatedEnvironmentsSchema, updateClusterSchema, deleteClusterSchema } from '@dso-console/shared'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les environnements associés au cluster
  app.get('/:clusterId/environments',
    {
      schema: getClusterAssociatedEnvironmentsSchema,
    },
    getClusterAssociatedEnvironmentsController)

  // Déclarer un nouveau cluster
  app.post('/',
    {
      schema: createClusterSchema,
    },
    createClusterController)

  // Mettre à jour un cluster
  app.put('/:clusterId',
    {
      schema: updateClusterSchema,
    },
    updateClusterController)

  // Supprimer un cluster
  app.delete('/:clusterId',
    {
      schema: deleteClusterSchema,
    },
    deleteClusterController)
}

export default router
