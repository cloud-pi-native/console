import { createProjectController } from '../controllers/project.js'

const router = async (app, _opt) => {
  await app.post('/', createProjectController)
}

export default router
