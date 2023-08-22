import { getDb } from '@/resources/system/db/controllers.js'

const router = async (app, _opt) => {
  await app.get('/', getDb)
}

export default router
