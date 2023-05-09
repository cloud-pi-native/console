// import {
//   createUserController,
// } from '../controllers/user.js'
import {
  getUsersController,
} from '../../controllers/admin/user.js'

const router = async (app, _opt) => {
  // TODO : routes non utilisées
  // await app.post('/', createUserController)

  // Récupérer tous les utilisateurs
  await app.get('/', getUsersController)
}

export default router
