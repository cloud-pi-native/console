import { repairPlugins } from '@/resources/system/plugin/controllers.js'

const router = async (app, _opt) => {
  await app.get('/repair', repairPlugins)
}

export default router
