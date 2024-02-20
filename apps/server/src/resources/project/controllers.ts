import type { FastifyInstance } from 'fastify'
import { addReqLogs } from '@/utils/logger.js'
import {
  sendOk,
  sendCreated,
  sendNoContent,
} from '@/utils/response.js'
import type { ProjectParams } from '@cpn-console/shared'
import {
  getUserProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  getProjectSecrets,
} from './business.js'
import projectEnvironmentRouter from '../environment/controllers.js'
import projectRepositoryRouter from '../repository/controllers.js'
import projectUserRouter from '../user/controllers.js'
import projectPermissionRouter from '../permission/controllers.js'
import {
  getProjectByIdSchema,
  getUserProjectsSchema,
  createProjectSchema,
  updateProjectSchema,
  archiveProjectSchema,
  // getProjectSecretsSchema,
} from '@cpn-console/shared'
import { FromSchema } from 'json-schema-to-ts'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer tous les projets d'un user
  app.get(
    '/',
    {
      schema: getUserProjectsSchema,
    },
    async (req, res) => {
      const requestor = req.session.user
      delete requestor.groups

      const projectsInfos = await getUserProjects(requestor)
      addReqLogs({
        req,
        description: 'Projets de l\'utilisateur récupérés avec succès',
        extras: {
          userId: requestor.id,
        },
      })
      sendOk(res, projectsInfos)
    },
  )

  // Récupérer un projet par son id
  app.get<{
    Params: FromSchema<typeof getProjectByIdSchema['params']>,
  }>('/:projectId',
    {
      schema: getProjectByIdSchema,
    },
    async (req, res) => {
      const projectId = req.params.projectId
      const userId = req.session.user.id

      const project = await getProject(projectId, userId)

      addReqLogs({
        req,
        description: 'Projet de l\'utilisateur récupéré avec succès',
        extras: {
          projectId,
          userId,
        },
      })
      sendOk(res, project)
    })

  // Récupérer les secrets d'un projet
  app.get<{
    Params: ProjectParams,
  }>('/:projectId/secrets',
    // TODO : pb schema, réponse inconnue (dépend des plugins)
    // {
    //   schema: getProjectSecretsSchema,
    // },
    async (req, res) => {
      const projectId = req.params.projectId
      const userId = req.session.user.id

      const projectSecrets = await getProjectSecrets(projectId, userId)

      addReqLogs({
        req,
        description: 'Secrets du projet récupérés avec succès',
        extras: {
          projectId,
          userId,
        },
      })
      sendOk(res, projectSecrets)
    })

  // Créer un projet
  app.post<{
    Body: FromSchema<typeof createProjectSchema['body']>
  }>('/',
    {
      schema: createProjectSchema,
    },
    async (req, res) => {
      const requestor = req.session.user
      delete requestor.groups
      const data = req.body

      const project = await createProject(data, requestor, req.id)
      addReqLogs({
        req,
        description: 'Projet créé avec succès',
        extras: {
          projectId: project.id,
        },
      })
      sendCreated(res, project)
    })

  // Mettre à jour un projet
  app.put<{
    Params: FromSchema<typeof updateProjectSchema['params']>,
    Body: FromSchema<typeof updateProjectSchema['body']>
  }>('/:projectId',
    {
      schema: updateProjectSchema,
    },
    async (req, res) => {
      const requestor = req.session.user
      const projectId = req.params.projectId
      const data = req.body

      const project = await updateProject(data, projectId, requestor, req.id)
      addReqLogs({
        req,
        description: 'Projet mis à jour avec succès',
        extras: {
          projectId,
        },
      })
      sendOk(res, project)
    })

  // Archiver un projet
  app.delete<{
    Params: FromSchema<typeof archiveProjectSchema['params']>
  }>('/:projectId',
    {
      schema: archiveProjectSchema,
    },
    async (req, res) => {
      const requestor = req.session.user
      const projectId = req.params.projectId

      await archiveProject(projectId, requestor, req.id)

      addReqLogs({
        req,
        description: 'Projet en cours de suppression',
        extras: {
          projectId,
        },
      })
      sendNoContent(res)
    })

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
