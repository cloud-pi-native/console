import { getDb } from '@/resources/system/db/controllers.js'
import { purgePlugins } from '@/resources/system/purge/controllers.js'

const router = async (app, _opt) => {
  await app.get('/db', getDb)
  if (process.env.UNSAFE === 'true') await app.post('/purge', purgePlugins)
}

export default router
