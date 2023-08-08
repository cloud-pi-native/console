import {
  getAllClustersController,
  createClusterController,
  updateClusterController,
} from '@/resources/cluster/admin/controllers.js'

const router = async (app, _opt) => {
  // Récupérer tous les clusters
  await app.get('/', getAllClustersController)
  // Déclarer un nouveau cluster
  await app.post('/', createClusterController)
  // Mettre à jour un cluster
  await app.put('/:clusterId', updateClusterController)
}

export default router
