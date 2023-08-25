import { filterObjectByKeys } from '@/utils/queries-tools.js'
import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { EnhancedFastifyRequest } from '@/types/index.js'
import { CreateRepositoryDto, DeleteRepositoryDto, UpdateRepositoryDto } from 'shared/src/resources/repository/dto.js'
import { checkProjectRole } from '@/resources/permission/business.js'
// TODO @claire_nollet attention, du coup je fais un truc bizarre
import { checkHookValidation, createRepositoryBusiness, deleteRepositoryBusiness, getProjectRepositoriesBusiness, getRepositoryByIdBusiness, updateRepositoryBusiness, checkProjectRoleDeletion } from './business.js'
import { BadRequestError } from '@/utils/errors.js'

// GET
export const getRepositoryByIdController = async (req, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  await checkProjectRole(projectId, userId)

  const repository = await getRepositoryByIdBusiness(projectId, userId)

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

export const getProjectRepositoriesController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  await checkProjectRole(projectId, userId)

  const repositories = await getProjectRepositoriesBusiness(projectId)

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
export const createRepositoryController = async (req: EnhancedFastifyRequest<CreateRepositoryDto>, res) => {
  const data = req.body
  const user = req.session?.user
  const projectId = req.params?.projectId
  data.projectId = projectId

  await checkProjectRole(projectId, user.id, 'owner')

  await checkHookValidation(user)

  const repo = await createRepositoryBusiness(projectId, data, user.id)

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
export const updateRepositoryController = async (req: EnhancedFastifyRequest<UpdateRepositoryDto>, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId

  const keysAllowedForUpdate = [
    'externalRepoUrl',
    'isPrivate',
    'externalToken',
    'externalUserName',
  ]
  const data: Partial<UpdateRepositoryDto['body']> = filterObjectByKeys(req.body, keysAllowedForUpdate)
  // Do not save external token in db
  const externalToken = data.externalToken
  delete data.externalToken

  await checkProjectRole(projectId, userId, 'owner')

  if (data.isPrivate && !externalToken) throw new BadRequestError('Le token est requis', undefined)
  if (data.isPrivate && !data.externalUserName) throw new BadRequestError('Le nom d\'utilisateur est requis', undefined)
  if (!data.isPrivate) {
    data.externalToken = undefined
    data.externalUserName = ''
  }

  await getRepositoryByIdBusiness(projectId, repositoryId)

  await updateRepositoryBusiness(projectId, repositoryId, data, userId)

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
export const deleteRepositoryController = async (req: EnhancedFastifyRequest<DeleteRepositoryDto>, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  // TODO @claire_nollet attention, du coup je fais un truc bizarre
  await checkProjectRoleDeletion(projectId, userId, 'owner')

  await deleteRepositoryBusiness(projectId, repositoryId, userId)

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
