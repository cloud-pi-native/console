// import {
//   getUsersController,
//   createUserController,
// } from '../controllers/user.js'
import {
  projectGetUsersController,
  projectAddUserController,
  projectRemoveUserController,
  projectUpdateUserController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  // TODO : routes non utilisées
  // await app.get('/', getUsersController)
  // await app.post('/', createUserController)

  // Récupérer les membres d'un projet
  await app.get('/:projectId/users', projectGetUsersController)

  // Ajouter un membre dans un projet
  await app.post('/:projectId/users', projectAddUserController)

  // Mettre à jour un membre d'un projet
  await app.put('/:projectId/users/:userId', projectUpdateUserController)

  // Supprimer un membre d'un projet
  await app.delete('/:projectId/users/:userId', projectRemoveUserController)
}

export default router
