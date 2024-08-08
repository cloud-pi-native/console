import {
  createProject,
  updateProject,
  archiveProject,
  getProjectSecrets,
  replayHooks,
  listProjects,
  generateProjectsData,
} from './business.js'
import { AdminAuthorized, ProjectAuthorized, projectContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { NotFound404, Forbidden403, ErrorResType, BadRequest400 } from '@/utils/errors.js'

export const projectRouter = () => serverInstance.router(projectContract, {

  // Récupérer des projets
  listProjects: async ({ request: req, query }) => {
    const requestor = req.session.user
    const { adminPermissions, user } = await authUser(requestor)
    if (query.filter === 'all' && !AdminAuthorized.isAdmin(adminPermissions)) {
      return new BadRequest400('Seul les admins avec les droits de visionnage des projet peuvent utiliser le filtre \'all\'')
    }
    const body = await listProjects(
      query,
      user.id,
    )

    return {
      status: 200,
      body,
    }
  },

  // Récupérer les secrets d'un projet
  getProjectSecrets: async ({ request: req, params }) => {
    const projectId = params.projectId
    const requestor = req.session.user
    const perms = await authUser(requestor, { id: projectId })
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
    const user = req.session.user
    const body = await createProject(data, user, req.id)

    if (body instanceof ErrorResType) return body

    return {
      status: 201,
      body,
    }
  },

  // Mettre à jour un projet
  updateProject: async ({ request: req, params, body: data }) => {
    const projectId = params.projectId
    const requestor = req.session.user
    const perms = await authUser(requestor, { id: projectId })

    const isAdmin = AdminAuthorized.isAdmin(perms.adminPermissions)
    const isOwner = perms.projectOwnerId === perms.user.id

    if (!perms.projectPermissions && !isAdmin) return new NotFound404()
    if (!isAdmin) { // filtrage des clés par niveau de permissions
      delete data.locked
      if (!isOwner) {
        delete data.ownerId // impossible de toucher à cette clé
      }
    }
    if (perms.projectLocked) {
      if (!isAdmin) return new Forbidden403('Le projet est verrouillé')
      if (data.locked !== false) return new Forbidden403('Veuillez déverrouiler le projet pour le mettre à jour')
    }

    if (!ProjectAuthorized.Manage(perms)) return new Forbidden403()
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

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
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    const isAdmin = AdminAuthorized.isAdmin(perms.adminPermissions)

    if (!perms.projectPermissions && !isAdmin) return new NotFound404()
    if (!ProjectAuthorized.ReplayHooks(perms)) return new Forbidden403()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const body = await replayHooks(projectId, user, req.id)

    if (body instanceof ErrorResType) return body

    return {
      status: 204,
      body,
    }
  },

  // Archiver un projet
  archiveProject: async ({ request: req, params }) => {
    const projectId = params.projectId
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    const isAdmin = AdminAuthorized.isAdmin(perms.adminPermissions)

    if (!perms.projectPermissions && !isAdmin) return new NotFound404()
    if (!ProjectAuthorized.Manage(perms)) return new Forbidden403()
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')

    const body = await archiveProject(projectId, user, req.id)
    if (body instanceof ErrorResType) return body

    return {
      status: 204,
      body,
    }
  },
  // Récupérer les données de tous les projets pour export
  getProjectsData: async ({ request: req }) => {
    const requestor = req.session.user
    const perms = await authUser(requestor)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
    const body = await generateProjectsData()

    return {
      status: 200,
      body,
    }
  },
})
