import {
  getAllLogsController,
  countAllLogsController,
} from '../../controllers/admin/logs.js'

const router = async (app, _opt) => {
  // Récupérer des logs
  await app.get('/:offset/:limit', getAllLogsController)
  // Compter tous les logs
  await app.get('/count', countAllLogsController)
}

export default router
