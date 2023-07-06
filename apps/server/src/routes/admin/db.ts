import { getDb } from '@/controllers/admin/db.js'

const router = async (app, _opt) => {
  await app.get('/', getDb)
}

export default router
