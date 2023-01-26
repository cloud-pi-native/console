import {
  getEnvironmentByIdController,
  environmentInitializingController,
  environmentDeletingController,
} from '../controllers/environment.js'

const router = async (app, _opt) => {
  // Récupérer un environnement par son id
  await app.get('/:environmentId', getEnvironmentByIdController)

  // Créer un environnement
  await app.post('/:projectId/environments', environmentInitializingController)

  // Supprimer un environnement
  await app.delete('/:projectId/environments/:environmentId', environmentDeletingController)
}

export default router
