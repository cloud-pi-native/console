import {
  getUserProjectByIdController,
  getUserProjectsController,
  createProjectController,
  addRepoController,
  addUserController,
  removeUserController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  await app.post('/', createProjectController)
  await app.post('/:id/repos', addRepoController)
  await app.post('/:id/users', addUserController)
  await app.get('/', getUserProjectsController)
  await app.get('/:id', getUserProjectByIdController)
  await app.delete('/:id/users', removeUserController)
}

export default router
