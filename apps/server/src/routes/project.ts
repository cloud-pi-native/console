import {
  getUserProjectsController,
  getProjectByIdController,
  createProjectController,
  archiveProjectController,
  updateProjectController,
} from '@/resources/project/controller.js'
import projectEnvironmentRouter from './project-environment.js'
import projectRepositoryRouter from './project-repository.js'
import projectUserRouter from './project-user.js'
import projectPermissionRouter from './project-permission.js'

const router = async (app, _opt) => {
  // Récupérer tous les projets d'un user
  await app.get('/', getUserProjectsController)

  // Récupérer un projet par son id
  await app.get('/:projectId', getProjectByIdController)

  // Créer un projet
  await app.post('/', createProjectController)

  // Mettre à jour un projet
  await app.put('/:projectId', updateProjectController)

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
