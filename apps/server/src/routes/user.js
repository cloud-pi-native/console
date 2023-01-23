import {
  getUsersController,
  createUserController,
} from '../controllers/user.js'

const router = async (app, _opt) => {
  await app.get('/', getUsersController)

  await app.post('/', createUserController)
}

export default router
