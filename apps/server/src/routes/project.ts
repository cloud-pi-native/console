import { type FastifyInstance } from 'fastify'

import {
  getUserProjectsController,
  getProjectByIdController,
  createProjectController,
  archiveProjectController,
  updateProjectController,
  getProjectSecretsController,
} from '@/resources/project/controllers.js'
import projectEnvironmentRouter from './project-environment.js'
import projectRepositoryRouter from './project-repository.js'
import projectUserRouter from './project-user.js'
import projectPermissionRouter from './project-permission.js'
import {
  getProjectByIdSchema,
  getUserProjectsSchema,
  createProjectSchema,
  updateProjectSchema,
  archiveProjectSchema,
  CreateProjectDto,
  UpdateProjectDto,
  // getProjectSecretsSchema,
} from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer tous les projets d'un user
  app.get(
    '/',
    {
      schema: getUserProjectsSchema,
    },
    getUserProjectsController,
  )

  // Récupérer un projet par son id
  app.get('/:projectId',
    {
      schema: getProjectByIdSchema,
    },
    getProjectByIdController)

  // Récupérer les secrets d'un projet
  app.get('/:projectId/secrets',
    // TODO : pb schema, réponse inconnue (dépend des plugins)
    // {
    //   schema: getProjectSecretsSchema,
    // },
    getProjectSecretsController)

  // Créer un projet
  app.post<{ Body: CreateProjectDto }>('/',
    {
      schema: createProjectSchema,
    },
    createProjectController)

  // Mettre à jour un projet
  app.put<{ Body: UpdateProjectDto }>('/:projectId',
    {
      schema: updateProjectSchema,
    },
    updateProjectController)

  // Archiver un projet
  app.delete('/:projectId',
    {
      schema: archiveProjectSchema,
    },
    archiveProjectController)

  // Enregistrement du sous routeur environment
  app.register(projectEnvironmentRouter)

  // Enregistrement du sous routeur repository
  app.register(projectRepositoryRouter)

  // Enregistrement du sous routeur user
  app.register(projectUserRouter)

  // Enregistrement du sous routeur permission
  app.register(projectPermissionRouter)
}

export default router
