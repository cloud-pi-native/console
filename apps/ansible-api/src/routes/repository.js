import { createRepositoryController } from '../controllers/repository.js'

const router = async (app, _opt) => {
  await app.post('/', createRepositoryController)
}

export default router
