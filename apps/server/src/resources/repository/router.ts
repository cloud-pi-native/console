import { ProjectAuthorized, repositoryContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

import { filterObjectByKeys } from '@/utils/queries-tools.js'
import {
  createRepository,
  deleteRepository,
  getProjectRepositories,
  syncRepository,
  updateRepository,
} from './business.js'
import { authUser, ErrorResType, Forbidden403, NotFound404 } from '@/utils/controller.js'

export const repositoryRouter = () => serverInstance.router(repositoryContract, {
  // Récupérer tous les repositories d'un projet
  listRepositories: async ({ request: req, query }) => {
    const projectId = query.projectId
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })

    if (perms.projectPermissions && !ProjectAuthorized.ListRepositories(perms)) return new Forbidden403()

    const body = await getProjectRepositories(projectId)

    return {
      status: 200,
      body,
    }
  },

  // Synchroniser un repository
  syncRepository: async ({ request: req, params, body }) => {
    const { repositoryId } = params
    const user = req.session.user
    const perms = await authUser(user, { id: repositoryId })
    if (!perms.projectPermissions) return new NotFound404()
    if (!ProjectAuthorized.ManageEnvironments(perms)) return new Forbidden403()
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const userId = req.session.user.id
    const { syncAllBranches, branchName } = body

    const resBody = await syncRepository({ repositoryId, userId, syncAllBranches, branchName, requestId: req.id })
    if (resBody instanceof ErrorResType) return resBody

    return {
      status: 204,
      body: resBody,
    }
  },

  // Créer un repository
  createRepository: async ({ request: req, body: data }) => {
    const projectId = data.projectId
    const userId = req.session.user.id
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    if (!perms.projectPermissions) return new Forbidden403()

    if (!ProjectAuthorized.ManageRepositories(perms)) return new NotFound404()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const body = await createRepository({ data, userId, requestId: req.id })
    if (body instanceof ErrorResType) return body

    return {
      status: 201,
      body,
    }
  },

  // Mettre à jour un repository
  updateRepository: async ({ request: req, params, body }) => {
    const repositoryId = params.repositoryId
    const user = req.session.user
    const perms = await authUser(user, { repositoryId })
    if (!ProjectAuthorized.ListRepositories(perms)) return new NotFound404()
    if (!ProjectAuthorized.ManageRepositories(perms)) return new Forbidden403()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const keysAllowedForUpdate = [
      'externalRepoUrl',
      'isPrivate',
      'externalToken',
      'externalUserName',
      'isInfra',
    ]
    const data = filterObjectByKeys(body, keysAllowedForUpdate)

    if (!data.isPrivate) {
      data.externalToken = undefined
      data.externalUserName = ''
    }

    const resBody = await updateRepository({ repositoryId, data, userId: user.id, requestId: req.id })
    if (resBody instanceof ErrorResType) return resBody

    return {
      status: 200,
      body: resBody,
    }
  },

  // Supprimer un repository
  deleteRepository: async ({ request: req, params }) => {
    const repositoryId = params.repositoryId
    const userId = req.session.user.id
    const user = req.session.user
    const perms = await authUser(user, { repositoryId })
    if (ProjectAuthorized.ListRepositories(perms)) return new NotFound404()
    if (!ProjectAuthorized.ManageRepositories(perms)) return new Forbidden403()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const body = await deleteRepository({
      repositoryId,
      userId,
      requestId: req.id,
    })
    if (body instanceof ErrorResType) return body

    return {
      status: 204,
      body,
    }
  },
})
