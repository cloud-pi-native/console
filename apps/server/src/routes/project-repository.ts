import {
  getRepositoryByIdController,
  getProjectRepositoriesController,
  createRepositoryController,
  updateRepositoryController,
  deleteRepositoryController,
} from '@/resources/repository/controllers.js'

const router = async (app, _opt) => {
  // Récupérer un repository par son id
  await app.get('/:projectId/repositories/:repositoryId', getRepositoryByIdController)

  // Récupérer tous les repositories d'un projet
  await app.get('/:projectId/repositories', getProjectRepositoriesController)

  // Créer un repository
  await app.post('/:projectId/repositories', createRepositoryController)

  // Mettre à jour un repository
  await app.put('/:projectId/repositories/:repositoryId', updateRepositoryController)

  // Supprimer un repository
  await app.delete('/:projectId/repositories/:repositoryId', deleteRepositoryController)
}

export default router
