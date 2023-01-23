import {
  getRepositoryByIdController,
  getProjectRepositoriesController,
  repositoryInitializingController,
  updateRepositoryController,
  repositoryDeletingController,
} from '../controllers/repo.js'

const router = async (app, _opt) => {
  await app.get('/:id', getRepositoryByIdController)
  await app.get('/project/:id', getProjectRepositoriesController)

  await app.post('/', repositoryInitializingController)

  await app.put('/:id', updateRepositoryController)

  await app.delete('/:id', repositoryDeletingController)
}

export default router
