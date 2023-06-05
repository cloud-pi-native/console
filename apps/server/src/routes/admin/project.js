import {
  getAllProjectsController,
} from '../../controllers/admin/project.js'

const router = async (app, _opt) => {
  // Récupérer tous les projets
  await app.get('/', getAllProjectsController)
}

export default router
