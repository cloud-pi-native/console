import {
  getAllLogsController,
} from '@/resources/log/admin/controllers.js'

const router = async (app, _opt) => {
  // Récupérer des logs
  await app.get('/', getAllLogsController)
}

export default router
