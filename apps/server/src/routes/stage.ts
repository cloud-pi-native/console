import {
  getStageController,
} from '../resources/stage/controllers.js'

const router = async (app, _opt) => {
  // Récupérer les stages disponibles
  await app.get('/', getStageController)
}

export default router
