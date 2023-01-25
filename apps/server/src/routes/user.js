// import {
//   getUsersController,
//   createUserController,
// } from '../controllers/user.js'
import {
  projectAddUserController,
  projectRemoveUserController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  // await app.get('/', getUsersController)
  // await app.post('/', createUserController)

  // TODO : controller get users via projectId dans UsersProjects
  await app.get('/projects/:projectId/users', projectAddUserController)

  await app.post('/projects/:projectId/users', projectAddUserController)

  // TODO : controller modifier rôle dans UsersProjects
  // await app.put('/projects/:projectId/users/:userId', projectAddUserController)

  await app.delete('/projects/:projectId/users/:userId', projectRemoveUserController)
}

export default router
