import { filterObjectByKeys } from '@/utils/queries-tools.js'
import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { type FastifyRequestWithSession } from '@/types/index.js'
import type {
  CreateRepositoryDto, UpdateRepositoryDto, RepositoryParams, ProjectRepositoriesParams,
} from '@dso-console/shared/src/resources/repository/dto.js'
import { createRepository, deleteRepository, getProjectRepositories, getRepositoryById, updateRepository, checkUpsertRepository } from './business.js'
import { BadRequestError } from '@/utils/errors.js'
import { type RouteHandler } from 'fastify'

// GET
export const getRepositoryByIdController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: RepositoryParams
}>, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

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
}

export const getProjectRepositoriesController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: ProjectRepositoriesParams
}>, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

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
}

// CREATE
export const createRepositoryController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: ProjectRepositoriesParams
  Body: CreateRepositoryDto
}>, res) => {
  const data = req.body
  const user = req.session?.user
  const projectId = req.params?.projectId

  const repo = await createRepository(projectId, data, user.id)

  addReqLogs({
    req,
    description: 'Dépôt créé avec succès',
    extras: {
      projectId,
      repositoryId: repo.id,
    },
  })
  sendCreated(res, repo)
}

// UPDATE
export const updateRepositoryController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: RepositoryParams
  Body: UpdateRepositoryDto
}>, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId

  const keysAllowedForUpdate = [
    'externalRepoUrl',
    'isPrivate',
    'externalToken',
    'externalUserName',
  ]
  const data: Partial<UpdateRepositoryDto> = filterObjectByKeys(req.body, keysAllowedForUpdate)

  await checkUpsertRepository(userId, projectId, 'owner')

  if (data.isPrivate && !data.externalToken) throw new BadRequestError('Le token est requis', undefined)
  if (data.isPrivate && !data.externalUserName) throw new BadRequestError('Le nom d\'utilisateur est requis', undefined)
  if (!data.isPrivate) {
    data.externalToken = undefined
    data.externalUserName = ''
  }

  await getRepositoryById(userId, projectId, repositoryId)

  await updateRepository(projectId, repositoryId, data, userId)

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
}

// DELETE
export const deleteRepositoryController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: RepositoryParams
}>, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  await deleteRepository(projectId, repositoryId, userId)

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
}
