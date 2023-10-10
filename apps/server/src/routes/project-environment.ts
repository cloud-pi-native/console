import {
  getEnvironmentByIdController,
  initializeEnvironmentController,
  updateEnvironmentController,
  deleteEnvironmentController,
  getQuotasController,
  getStageController,
} from '../resources/environment/controllers.js'

const router = async (app, _opt) => {
  // Récupérer un environnement par son id
  await app.get('/:projectId/environments/:environmentId', getEnvironmentByIdController)

  // Créer un environnement
  await app.post('/:projectId/environments', initializeEnvironmentController)

  // Mettre à jour un environnement
  await app.put('/:projectId/environments/:environmentId', updateEnvironmentController)

  // Supprimer un environnement
  await app.delete('/:projectId/environments/:environmentId', deleteEnvironmentController)

  // Récupérer les quotas disponibles
  await app.get('/environments/quotas', getQuotasController)

  // Récupérer les environnements DSO disponibles
  await app.get('/environments/dso-environments', getStageController)
}

export default router
