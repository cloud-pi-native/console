import {
  getEnvironmentByIdController,
  environmentInitializingController,
  environmentDeletingController,
} from '../controllers/environment.js'

const router = async (app, _opt) => {
  // GET
  await app.get('/:id', getEnvironmentByIdController)
  // POST
  await app.post('/', environmentInitializingController)
  // DELETE
  await app.delete('/:id', environmentDeletingController)
}

export default router
