import {
  getEnvironmentByIdController,
  environmentInitializingController,
  environmentDeletingController,
} from '../controllers/environment.js'

const router = async (app, _opt) => {
  await app.get('/:id', getEnvironmentByIdController)

  await app.post('/', environmentInitializingController)

  await app.delete('/:id', environmentDeletingController)
}

export default router
