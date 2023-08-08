import {
  getAllProjectsController,
} from '@/resources/project/admin/controllers.js'

const router = async (app, _opt) => {
  // Récupérer tous les projets
  await app.get('/', getAllProjectsController)
}

export default router
