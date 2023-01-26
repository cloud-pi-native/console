import {
  getUserProjectsController,
  getProjectByIdController,
  createProjectController,
  projectArchivingController,
} from '../controllers/project.js'

const router = async (app, _opt) => {
  // Récupérer tous les projet d'un user
  await app.get('/', getUserProjectsController)

  // Récupérer un projet par son id
  await app.get('/:projectId', getProjectByIdController)

  // Créer un projet
  await app.post('/', createProjectController)

  // Archiver un projet
  await app.delete('/:projectId', projectArchivingController)
}

export default router
