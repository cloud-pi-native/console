import {
  getEnvironmentPermissionsController,
  setPermissionController,
  updatePermissionController,
  deletePermissionController,
} from '../controllers/permission.js'

const router = async (app, _opt) => {
  // Récupérer les permissions d'un environnement
  await app.get('/:projectId/environments/:environmentId/permissions', getEnvironmentPermissionsController)

  // Créer une permission
  await app.post('/:projectId/environments/:environmentId/permissions', setPermissionController)

  // Mettre à jour le level d'une permission
  await app.put('/:projectId/environments/:environmentId/:permissionId', updatePermissionController)

  // Supprimer une permission
  await app.delete('/:projectId/environments/:environmentId/permissions/:userId', deletePermissionController)
}

export default router
