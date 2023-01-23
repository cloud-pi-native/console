import {
  getUserProjectsController,
  getProjectByIdController,
  createProjectController,
  projectAddUserController,
  projectRemoveUserController,
  projectArchivingController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  await app.get('/', getUserProjectsController)
  await app.get('/:id', getProjectByIdController)

  await app.post('/', createProjectController)

  await app.put('/:id/users', projectAddUserController)

  await app.delete('/:id/users', projectRemoveUserController)
  await app.delete('/:id', projectArchivingController)
}

export default router
