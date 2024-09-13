import { AdminAuthorized, ProjectAuthorized, fakeToken, repositoryContract } from '@cpn-console/shared'
import {
  createRepository,
  deleteRepository,
  getProjectRepositories,
  syncRepository,
  updateRepository,
} from './business.js'
import { serverInstance } from '@/app.js'

import { filterObjectByKeys } from '@/utils/queries-tools.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403, NotFound404, Unauthorized401 } from '@/utils/errors.js'

export function repositoryRouter() {
  return serverInstance.router(repositoryContract, {
  // Récupérer tous les repositories d'un projet
    listRepositories: async ({ request: req, query }) => {
      const projectId = query.projectId
      const perms = await authUser(req, { id: projectId })

      if (!ProjectAuthorized.ListRepositories(perms)) return new Forbidden403()

      const body = await getProjectRepositories(projectId)

      return {
        status: 200,
        body,
      }
    },

    // Synchroniser un repository
    syncRepository: async ({ request: req, params, body }) => {
      const { repositoryId } = params
      const perms = await authUser(req, { repositoryId })
      if (!perms.user) return new Unauthorized401('Require to be requested from user not api key')
      if (!perms.projectPermissions) return new NotFound404()
      if (!ProjectAuthorized.ManageRepositories(perms)) return new Forbidden403()
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const { syncAllBranches, branchName } = body

      const resBody = await syncRepository({ repositoryId, userId: perms.user.id, branchName, requestId: req.id, syncAllBranches })
      if (resBody instanceof ErrorResType) return resBody

      return {
        status: 204,
        body: resBody,
      }
    },

    // Créer un repository
    createRepository: async ({ request: req, body: data }) => {
      const projectId = data.projectId
      const perms = await authUser(req, { id: projectId })

      if (!perms.user) return new Unauthorized401('Require to be requested from user not api key')
      if (!perms.projectPermissions && !AdminAuthorized.isAdmin(perms.adminPermissions)) return new NotFound404()
      if (!ProjectAuthorized.ManageRepositories(perms)) return new Forbidden403()
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const body = await createRepository({ data, userId: perms.user.id, requestId: req.id })
      if (body instanceof ErrorResType) return body

      return {
        status: 201,
        body,
      }
    },

    // Mettre à jour un repository
    updateRepository: async ({ request: req, params, body }) => {
      const repositoryId = params.repositoryId
      const perms = await authUser(req, { repositoryId })

      if (!perms.user) return new Unauthorized401('Require to be requested from user not api key')
      if (!perms.projectPermissions && !AdminAuthorized.isAdmin(perms.adminPermissions)) return new NotFound404()
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

      if (data.externalToken === fakeToken) {
        delete data.externalToken
      }

      if (data.isPrivate === false) {
        delete data.externalToken
        delete data.externalUserName
      }

      const resBody = await updateRepository({ repositoryId, data, userId: perms.user.id, requestId: req.id })
      if (resBody instanceof ErrorResType) return resBody

      return {
        status: 200,
        body: resBody,
      }
    },

    // Supprimer un repository
    deleteRepository: async ({ request: req, params }) => {
      const repositoryId = params.repositoryId
      const perms = await authUser(req, { repositoryId })

      if (!perms.user) return new Unauthorized401('Require to be requested from user not api key')
      if (!perms.projectPermissions) return new NotFound404()
      if (!ProjectAuthorized.ManageRepositories(perms)) return new Forbidden403()
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const body = await deleteRepository({
        repositoryId,
        userId: perms.user.id,
        requestId: req.id,
        projectId: perms.projectId,
      })
      if (body instanceof ErrorResType) return body

      return {
        status: 204,
        body,
      }
    },
  })
}
