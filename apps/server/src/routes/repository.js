import {
  getRepositoryByIdController,
  getProjectRepositoriesController,
  repositoryInitializingController,
  updateRepositoryController,
  repositoryDeletingController,
} from '../controllers/repository.js'

const router = async (app, _opt) => {
  // Récupérer un repository par son id
  await app.get('/:projectId/:repositoryId', getRepositoryByIdController)

  // Récupérer tous les repositories d'un projet
  await app.get('/:projectId/repositories', getProjectRepositoriesController)

  // Créer un repository
  await app.post('/:projectId/repositories', repositoryInitializingController)

  // Mettre à jour un repository
  await app.put('/:projectId/repositories/:repositoryId', updateRepositoryController)

  // Supprimer un repository
  await app.delete('/:projectId/repositories/:repositoryId', repositoryDeletingController)
}

export default router
