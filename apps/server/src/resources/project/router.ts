import type { AsyncReturnType } from '@cpn-console/shared'
import { AdminAuthorized, ProjectAuthorized, projectContract } from '@cpn-console/shared'
import {
  archiveProject,
  bulkActionProject,
  createProject,
  generateProjectsData,
  getProject,
  getProjectSecrets,
  listProjects,
  replayHooks,
  updateProject,
} from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403, NotFound404, Unauthorized401 } from '@/utils/errors.js'

export function projectRouter() {
  return serverInstance.router(projectContract, {

    // Récupérer des projets
    listProjects: async ({ request: req, query }) => {
      const { adminPermissions, user } = await authUser(req)
      let body: AsyncReturnType<typeof listProjects> = []

      if (adminPermissions && !user) { // c'est donc un compte de service
        query.filter = 'all'
      }
      if (query.filter === 'all' && !AdminAuthorized.Manage(adminPermissions)) {
        return new Forbidden403('Seuls les admins avec les droits de visionnage des projets peuvent utiliser le filtre \'all\'')
      }

      body = await listProjects(
        query,
        user?.id,
      )

      return {
        status: 200,
        body,
      }
    },

    // Récupérer les secrets d'un projet
    getProjectSecrets: async ({ request: req, params }) => {
      const projectId = params.projectId
      const perms = await authUser(req, { id: projectId })
      if (!perms.projectPermissions) return new NotFound404()
      if (!ProjectAuthorized.SeeSecrets(perms)) return new Forbidden403()
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const body = await getProjectSecrets(projectId)

      if (body instanceof ErrorResType) return body

      return {
        status: 200,
        body,
      }
    },

    // Créer un projet
    createProject: async ({ request: req, body: data }) => {
      const perms = await authUser(req)
      if (perms.user?.type !== 'human') return new Unauthorized401('Cannot find requestor in database')
      if (!AdminAuthorized.ManageProjects(perms.adminPermissions)) return new Forbidden403()

      const body = await createProject(data, perms.user, req.id)

      if (body instanceof ErrorResType) return body

      return {
        status: 201,
        body,
      }
    },

    // Récuperer un seul projet
    getProject: async ({ request: req, params }) => {
      const projectId = params.projectId
      const perms = await authUser(req, { id: projectId })

      if (!perms.projectId) return new NotFound404()
      if (!perms.projectPermissions) return new NotFound404()
      if (!ProjectAuthorized.Manage(perms)) return new Forbidden403()
      if (perms.projectStatus === 'archived') return new NotFound404()

      const body = await getProject(projectId)

      return {
        status: 200,
        body,
      }
    },

    // Mettre à jour un projet
    updateProject: async ({ request: req, params, body: data }) => {
      const projectId = params.projectId
      const perms = await authUser(req, { id: projectId })

      if (!perms.user) return new Unauthorized401('Cannot find requestor in database')
      if (!ProjectAuthorized.Manage(perms)) return new Forbidden403()

      const isAdmin = AdminAuthorized.Manage(perms.adminPermissions)
      const isOwner = perms.projectOwnerId === perms.user.id
      if (!isAdmin) {
        delete data.locked
        if (!isOwner) delete data.ownerId // impossible de toucher à cette clé
      }
      if (perms.projectLocked) {
        if (!isAdmin) return new Forbidden403('Le projet est verrouillé')
        if (data.locked !== false) return new Forbidden403('Veuillez déverrouiler le projet pour le mettre à jour')
      }

      const body = await updateProject(data, projectId, perms.user, req.id)

      if (body instanceof ErrorResType) return body
      return {
        status: 200,
        body,
      }
    },

    // Reprovisionner un projet
    replayHooksForProject: async ({ request: req, params }) => {
      const projectId = params.projectId
      const perms = await authUser(req, { id: projectId })

      if (!ProjectAuthorized.ReplayHooks(perms)) return new Forbidden403()

      const body = await replayHooks({
        projectId,
        userId: perms.user?.id,
        requestId: req.id,
      })

      if (body instanceof ErrorResType) return body

      return {
        status: 204,
        body,
      }
    },

    // Archiver un projet
    archiveProject: async ({ request: req, params }) => {
      const projectId = params.projectId
      const perms = await authUser(req, { id: projectId })

      if (!perms.user) return new Unauthorized401('Cannot find requestor in database')
      if (!ProjectAuthorized.Manage(perms)) return new Forbidden403()

      const body = await archiveProject(projectId, perms.user, req.id)
      if (body instanceof ErrorResType) return body

      return {
        status: 204,
        body,
      }
    },
    // Récupérer les données de tous les projets pour export
    getProjectsData: async ({ request: req }) => {
      const perms = await authUser(req)

      if (!AdminAuthorized.Manage(perms.adminPermissions)) return new Forbidden403()
      const body = await generateProjectsData()

      return {
        status: 200,
        body,
      }
    },

    bulkActionProject: async ({ request: req, body }) => {
      const perms = await authUser(req)

      if (!perms.user) return new Unauthorized401('Cannot find requestor in database')
      if (!AdminAuthorized.Manage(perms.adminPermissions)) return new Forbidden403()

      await bulkActionProject(body, perms.user, req.id)

      return {
        status: 202,
        body: null,
      }
    },
  })
}
