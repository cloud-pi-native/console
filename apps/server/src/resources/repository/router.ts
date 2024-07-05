import { adminGroupPath, repositoryContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { BadRequestError } from '@/utils/errors.js'
import { addReqLogs } from '@/utils/logger.js'
import { filterObjectByKeys } from '@/utils/queries-tools.js'
import {
  checkUpsertRepository,
  createRepository,
  deleteRepository,
  getProjectRepositories,
  getRepositoryById,
  syncRepository,
  updateRepository,
} from './business.js'

export const repositoryRouter = () => serverInstance.router(repositoryContract, {

  // Récupérer un repository par son id
  getRepositoryById: async ({ request: req, params }) => {
    const projectId = params.projectId
    const repositoryId = params.repositoryId
    const userId = req.session.user.id

    const repository = await getRepositoryById(userId, projectId, repositoryId)

    addReqLogs({
      req,
      message: 'Dépôt récupéré avec succès',
      infos: {
        repositoryId,
        projectId,
      },
    })
    return {
      status: 200,
      body: repository,
    }
  },

  // Récupérer tous les repositories d'un projet
  getRepositories: async ({ request: req, params }) => {
    const projectId = params.projectId
    const userId = req.session.user.id
    const isAdmin = req.session.user.groups?.includes(adminGroupPath)

    const repositories = await getProjectRepositories(userId, isAdmin, projectId)

    addReqLogs({
      req,
      message: 'Dépôts du projet récupérés avec succès',
      infos: {
        projectId,
        repositoriesId: repositories.map(({ id }) => id).join(', '),
      },
    })
    return {
      status: 200,
      body: repositories,
    }
  },

  // Synchroniser un repository
  syncRepository: async ({ request: req, params, body }) => {
    const userId = req.session.user.id
    const { projectId, repositoryId } = params
    const { branchName } = body

    await syncRepository(projectId, repositoryId, userId, branchName, req.id)

    return {
      body: null,
      status: 204,
    }
  },

  // Créer un repository
  createRepository: async ({ request: req, params, body: data }) => {
    const userId = req.session.user.id
    const projectId = params.projectId

    const repository = await createRepository(projectId, data, userId, req.id)

    addReqLogs({
      req,
      message: 'Dépôt créé avec succès',
      infos: {
        projectId,
        repositoryId: repository.id,
      },
    })
    return {
      status: 201,
      body: repository,
    }
  },

  // Mettre à jour un repository
  updateRepository: async ({ request: req, params, body }) => {
    const userId = req.session.user.id
    const projectId = params.projectId
    const repositoryId = params.repositoryId

    const keysAllowedForUpdate = [
      'externalRepoUrl',
      'isPrivate',
      'externalToken',
      'externalUserName',
      'isInfra',
    ]
    const data = filterObjectByKeys(body, keysAllowedForUpdate)

    await checkUpsertRepository(userId, projectId, 'owner')

    if (data.isPrivate && !data.externalToken) throw new BadRequestError('Le token est requis', undefined)
    if (data.isPrivate && !data.externalUserName) throw new BadRequestError('Le nom d\'utilisateur est requis', undefined)
    if (!data.isPrivate) {
      data.externalToken = undefined
      data.externalUserName = ''
    }

    await getRepositoryById(userId, projectId, repositoryId)

    const repository = await updateRepository(projectId, repositoryId, data, userId, req.id)

    const message = 'Dépôt mis à jour avec succès'
    addReqLogs({
      req,
      message,
      infos: {
        projectId,
        repositoryId,
      },
    })
    return {
      status: 200,
      body: repository,
    }
  },

  // Supprimer un repository
  deleteRepository: async ({ request: req, params }) => {
    const projectId = params.projectId
    const repositoryId = params.repositoryId
    const userId = req.session.user.id

    await deleteRepository(projectId, repositoryId, userId, req.id)

    const message = 'Dépôt en cours de suppression'
    addReqLogs({
      req,
      message,
      infos: {
        projectId,
        repositoryId,
      },
    })
    return {
      status: 204,
      body: null,
    }
  },
})
