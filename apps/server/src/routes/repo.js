import {
  getRepositoryByIdController,
  getProjectRepositoriesController,
  repositoryInitializingController,
  updateRepositoryController,
  repositoryDeletingController,
} from '../controllers/repo.js'

const router = async (app, _opt) => {
  // GET
  await app.get('/:id', getRepositoryByIdController)
  await app.get('/project/:id', getProjectRepositoriesController)
  // POST
  await app.post('/', repositoryInitializingController)
  // PUT
  await app.put('/:id', updateRepositoryController)
  // DELETE
  await app.delete('/:id', repositoryDeletingController)
}

export default router
