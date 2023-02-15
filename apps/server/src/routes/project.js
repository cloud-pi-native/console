import {
  getUserProjectsController,
  getProjectByIdController,
  createProjectController,
  archiveProjectController,
  getProjectOwnerController,
} from '../controllers/project.js'
import projectEnvironmentRouter from './project-environment.js'
import projectRepositoryRouter from './project-repository.js'
import projectUserRouter from './project-user.js'
import projectPermissionRouter from './project-permission.js'

const router = async (app, _opt) => {
  // Récupérer tous les projets d'un user
  await app.get('/', getUserProjectsController)

  // Récupérer un projet par son id
  await app.get('/:projectId', getProjectByIdController)

  // Récupérer le owner d'un projet
  await app.get('/:projectId/owner', getProjectOwnerController)

  // Créer un projet
  await app.post('/', createProjectController)

  // Archiver un projet
  await app.delete('/:projectId', archiveProjectController)

  // Enregistrement du sous routeur environment
  await app.register(projectEnvironmentRouter)

  // Enregistrement du sous routeur repository
  await app.register(projectRepositoryRouter)

  // Enregistrement du sous routeur user
  await app.register(projectUserRouter)

  // Enregistrement du sous routeur permission
  await app.register(projectPermissionRouter)
}

export default router
