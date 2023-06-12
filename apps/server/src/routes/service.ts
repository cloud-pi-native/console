import { checkServicesHealthController } from '../controllers/service.js'

const router = async (app, _opt) => {
  await app.get('/', checkServicesHealthController)
}

export default router
