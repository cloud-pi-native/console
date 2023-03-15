import {
  checkServiceHealthController,
} from '../controllers/service.js'

const router = async (app, _opt) => {
  // Récupérer l'état d'un service
  await app.post('/:projectId/services', checkServiceHealthController)
}

export default router
