import {
  getProjectUsersController,
  addUserToProjectController,
  removeUserFromProjectController,
  updateUserProjectRoleController,
  getMatchingUsersController,
} from '@/resources/user/controllers.js'

const router = async (app, _opt) => {
  // TODO : pas utilisé
  // Récupérer les membres d'un projet
  await app.get('/:projectId/users', getProjectUsersController)

  // Récupérer des utilisateurs par match
  await app.get('/:projectId/users/match', getMatchingUsersController)

  // Ajouter un membre dans un projet
  await app.post('/:projectId/users', addUserToProjectController)

  // Mettre à jour un membre d'un projet
  await app.put('/:projectId/users/:userId', updateUserProjectRoleController)

  // Supprimer un membre d'un projet
  await app.delete('/:projectId/users/:userId', removeUserFromProjectController)
}

export default router
