import {
  getClustersController,
} from '../resources/cluster/controllers.js'

const router = async (app, _opt) => {
  // Récupérer les quotas disponibles
  await app.get('/', getClustersController)
}

export default router
