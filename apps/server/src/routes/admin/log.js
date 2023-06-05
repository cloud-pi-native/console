import { getLogsController } from '../../controllers/admin/logs.js'

const router = async (app, _opt) => {
  // Récupérer toutes les organisations
  await app.get('/', getLogsController)
}

export default router
