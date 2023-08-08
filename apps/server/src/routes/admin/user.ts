import {
  getUsersController,
} from '@/resources/user/admin/controllers.js'

const router = async (app, _opt) => {
  // Récupérer tous les utilisateurs
  await app.get('/', getUsersController)
}

export default router
