import {
  getEnvironmentByIdController,
  initializeEnvironmentController,
  deleteEnvironmentController,
} from '../controllers/environment.js'

const router = async (app, _opt) => {
  // Récupérer un environnement par son id
  await app.get('/:projectId/environments/:environmentId', getEnvironmentByIdController)

  // Créer un environnement
  await app.post('/:projectId/environments', initializeEnvironmentController)

  // Supprimer un environnement
  await app.delete('/:projectId/environments/:environmentId', deleteEnvironmentController)
}

export default router
