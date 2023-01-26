import {
// TODO : aucun controller n'existe
  envGetPermissionsController,
  envAddPermissionsController,
  envUpdatePermissionController,
  envRemovePermissionController,
} from '../controllers/permissions.js'

const router = async (app, _opt) => {
  // Récupérer les permissions d'un environnement
  await app.get('/:projectId/environments/:environmentId/permissions', envGetPermissionsController)

  // Créer une permission
  await app.post('/:projectId/environments/:environmentId/permissions', envAddPermissionsController)

  // Mettre à jour le level d'une permission
  await app.put('/:projectId/environments/:environmentId/:permissionId', envUpdatePermissionController)

  // Supprimer une permission
  await app.delete('/:projectId/environments/:environmentId/:permissionId', envRemovePermissionController)
}

export default router
