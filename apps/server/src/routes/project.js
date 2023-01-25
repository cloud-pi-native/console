import {
  getUserProjectsController,
  getProjectByIdController,
  projectAddUserController,
  projectArchivingController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  await app.get('/projects', getUserProjectsController)

  await app.get('/projects/:projectId', getProjectByIdController)

  await app.post('/:id/users', projectAddUserController)

  await app.delete('/projects/:projectId', projectArchivingController)
}

export default router
