import {
  getProjectByIdController,
  getProjectsController,
  createProjectController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  await app.post('/', createProjectController)
  await app.get('/', getProjectsController)
  await app.get('/:id', getProjectByIdController)
}

export default router
