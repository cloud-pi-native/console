import { checkServicesHealthController } from '@/resources/service/controllers.js'

const router = async (app, _opt) => {
  await app.get('/', checkServicesHealthController)
}

export default router
