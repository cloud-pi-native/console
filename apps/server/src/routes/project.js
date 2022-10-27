import {
  getUserProjectByIdController,
  getUserProjectsController,
  createProjectController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  await app.post('/', createProjectController)
  await app.get('/', getUserProjectsController)
  await app.get('/:id', getUserProjectByIdController)
}

export default router
