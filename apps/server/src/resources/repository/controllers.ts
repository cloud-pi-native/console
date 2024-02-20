import type { FastifyInstance } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import { filterObjectByKeys } from '@/utils/queries-tools.js'
import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { createRepository, deleteRepository, getProjectRepositories, getRepositoryById, updateRepository, checkUpsertRepository } from './business.js'
import { BadRequestError } from '@/utils/errors.js'
import { createRepositorySchema, deleteRepositorySchema, getProjectRepositoriesSchema, getRepositoryByIdSchema, updateRepositorySchema } from '@cpn-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer un repository par son id
  app.get<{
    Params: FromSchema<typeof getRepositoryByIdSchema['params']>
  }>('/:projectId/repositories/:repositoryId',
    {
      schema: getRepositoryByIdSchema,
    },
    async (req, res) => {
      const projectId = req.params.projectId
      const repositoryId = req.params.repositoryId
      const userId = req.session.user.id

      const repository = await getRepositoryById(userId, projectId, repositoryId)

      addReqLogs({
        req,
        description: 'Dépôt récupéré avec succès',
        extras: {
          repositoryId,
          projectId,
        },
      })
      sendOk(res, repository)
    })

  // Récupérer tous les repositories d'un projet
  app.get<{
    Params: FromSchema<typeof getProjectRepositoriesSchema['params']>
  }>('/:projectId/repositories',
    {
      schema: getProjectRepositoriesSchema,
    },
    async (req, res) => {
      const projectId = req.params.projectId
      const userId = req.session.user.id

      const repositories = await getProjectRepositories(userId, projectId)

      addReqLogs({
        req,
        description: 'Dépôts du projet récupérés avec succès',
        extras: {
          projectId,
          repositoriesId: repositories.map(({ id }) => id).join(', '),
        },
      })
      sendOk(res, repositories)
    })

  // Créer un repository
  app.post<{
    Params: FromSchema<typeof createRepositorySchema['params']>,
    Body: FromSchema<typeof createRepositorySchema['body']>
  }>('/:projectId/repositories',
    {
      schema: createRepositorySchema,
    },
    async (req, res) => {
      const data = req.body
      const userId = req.session.user.id
      const projectId = req.params.projectId

      const repo = await createRepository(projectId, data, userId, req.id)

      addReqLogs({
        req,
        description: 'Dépôt créé avec succès',
        extras: {
          projectId,
          repositoryId: repo.id,
        },
      })
      sendCreated(res, repo)
    })

  // Mettre à jour un repository
  app.put<{
    Params: FromSchema<typeof updateRepositorySchema['params']>
    Body: FromSchema<typeof updateRepositorySchema['params']>
  }>('/:projectId/repositories/:repositoryId',
    {
      schema: updateRepositorySchema,
    },
    async (req, res) => {
      const userId = req.session.user.id
      const projectId = req.params.projectId
      const repositoryId = req.params.repositoryId

      const keysAllowedForUpdate = [
        'externalRepoUrl',
        'isPrivate',
        'externalToken',
        'externalUserName',
      ]
      const data: Partial<FromSchema<typeof updateRepositorySchema['params']>> = filterObjectByKeys(req.body, keysAllowedForUpdate)

      await checkUpsertRepository(userId, projectId, 'owner')

      if (data.isPrivate && !data.externalToken) throw new BadRequestError('Le token est requis', undefined)
      if (data.isPrivate && !data.externalUserName) throw new BadRequestError('Le nom d\'utilisateur est requis', undefined)
      if (!data.isPrivate) {
        data.externalToken = undefined
        data.externalUserName = ''
      }

      await getRepositoryById(userId, projectId, repositoryId)

      await updateRepository(projectId, repositoryId, data, userId, req.id)

      const description = 'Dépôt mis à jour avec succès'
      addReqLogs({
        req,
        description,
        extras: {
          projectId,
          repositoryId,
        },
      })
      sendOk(res, description)
    })

  // Supprimer un repository
  app.delete<{
    Params: FromSchema<typeof deleteRepositorySchema['params']>
  }>('/:projectId/repositories/:repositoryId',
    {
      schema: deleteRepositorySchema,
    },
    async (req, res) => {
      const projectId = req.params.projectId
      const repositoryId = req.params.repositoryId
      const userId = req.session.user.id

      await deleteRepository(projectId, repositoryId, userId, req.id)

      const description = 'Dépôt en cours de suppression'
      addReqLogs({
        req,
        description,
        extras: {
          projectId,
          repositoryId,
        },
      })
      sendOk(res, description)
    })
}

export default router
