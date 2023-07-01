import {
  getAllLogsController,
} from '../../controllers/admin/logs.js'

const router = async (app, _opt) => {
  // Récupérer des logs
  await app.get('/', getAllLogsController)
}

export default router
