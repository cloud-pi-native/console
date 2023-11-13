import {
  createClusterController,
  updateClusterController,
} from '@/resources/cluster/admin/controllers.js'

const router = async (app, _opt) => {
  // Déclarer un nouveau cluster
  await app.post('/', createClusterController)

  // Mettre à jour un cluster
  await app.put('/:clusterId', updateClusterController)
}

export default router
