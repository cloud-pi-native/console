// import {
//   getUsersController,
//   createUserController,
// } from '../controllers/user.js'
import {
  getProjectUsersController,
  addUserToProjectController,
  removeUserFromProjectController,
  updateUserProjectRoleController,
} from '../controllers/user.js'

const router = async (app, _opt) => {
  // TODO : routes non utilisées
  // await app.get('/', getUsersController)
  // await app.post('/', createUserController)

  // Récupérer les membres d'un projet
  await app.get('/:projectId/users', getProjectUsersController)

  // Ajouter un membre dans un projet
  await app.post('/:projectId/users', addUserToProjectController)

  // Mettre à jour un membre d'un projet
  await app.put('/:projectId/users/:userId', updateUserProjectRoleController)

  // Supprimer un membre d'un projet
  await app.delete('/:projectId/users/:userId', removeUserFromProjectController)
}

export default router
