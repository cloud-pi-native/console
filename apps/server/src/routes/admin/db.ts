import { getDbController } from '@/resources/system/db/controllers.js'

const router = async (app, _opt) => {
  await app.get('/', getDbController)
}

export default router
