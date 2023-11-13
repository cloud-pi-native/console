import {
  getClusterAssociatedEnvironmentsController,
  createClusterController,
  updateClusterController,
  deleteClusterController,
} from '@/resources/cluster/admin/controllers.js'

const router = async (app, _opt) => {
  // Récupérer les environnements associés au cluster
  await app.get('/:clusterId/environments', getClusterAssociatedEnvironmentsController)

  // Déclarer un nouveau cluster
  await app.post('/', createClusterController)

  // Mettre à jour un cluster
  await app.put('/:clusterId', updateClusterController)

  // Supprimer un cluster
  await app.delete('/:clusterId', deleteClusterController)
}

export default router
