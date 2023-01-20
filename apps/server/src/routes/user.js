import {
  getUsersController,
  createUserController,
} from '../controllers/user.js'

const router = async (app, _opt) => {
  // GET
  await app.get('/', getUsersController)
  // POST
  await app.post('/', createUserController)
}

export default router
