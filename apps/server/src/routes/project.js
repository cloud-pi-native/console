import {
  getUserProjectsController,
  getProjectByIdController,
  createProjectController,
  projectArchivingController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  await app.get('/projects', getUserProjectsController)

  await app.get('/projects/:projectId', getProjectByIdController)

  await app.post('/projects', createProjectController)

  await app.delete('/projects/:projectId', projectArchivingController)
}

export default router
