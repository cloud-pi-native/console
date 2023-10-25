import {
  getQuotasController,
} from '../resources/quota/controllers.js'

const router = async (app, _opt) => {
  // Récupérer les quotas disponibles
  await app.get('/', getQuotasController)
}

export default router
