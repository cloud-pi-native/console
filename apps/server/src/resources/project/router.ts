import {
  createProject,
  updateProject,
  archiveProject,
  getProjectSecrets,
  replayHooks,
  listProjects,
  handleProjectLocking,
  generateProjectsData,
} from './business.js'
import { AdminAuthorized, ProjectAuthorized, projectContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { authUser, NotFound404, Forbidden403, ErrorResType, BadRequest400 } from '@/utils/controller.js'

export const projectRouter = () => serverInstance.router(projectContract, {

  // Récupérer des projets
  listProjects: async ({ request: req, query }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (query.filter === 'all' && !AdminAuthorized.isAdmin(perms.adminPermissions)) {
      return new BadRequest400('Seul les admins avec les droits de visionnage de projet peuvent utiliser le filtre \'all\'')
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
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    if (!perms.projectPermissions) return new NotFound404()
    if (!ProjectAuthorized.SeeSecrets(perms)) return new Forbidden403()
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const body = await getProjectSecrets(projectId, user.id)

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
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    if (
      data.ownerId && perms.projectOwnerId !== data.ownerId // Il essaye de changer le owner
      && (
        perms.projectOwnerId !== user.id // mais il n'est ni owner
        || !AdminAuthorized.isAdmin(perms.adminPermissions) // ni authorisé comme admin
      )
    ) return new Forbidden403('Seul le owner du projet peut transférer le projet')
    if (!ProjectAuthorized.Manage(perms)) return new Forbidden403()
    if (!perms.projectPermissions) return new NotFound404()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const body = await updateProject(data, projectId, user, req.id)

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
    if (!ProjectAuthorized.ReplayHooks(perms)) return new Forbidden403()
    if (!perms.projectPermissions) return new NotFound404()
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
    if (!ProjectAuthorized.Manage(perms)) return new Forbidden403()
    if (!perms.projectPermissions) return new NotFound404()
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
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
    const body = await generateProjectsData()

    return {
      status: 200,
      body,
    }
  },

  // (Dé)verrouiller un projet
  patchProject: async ({ request: req, params, body: data }) => {
    const user = req.session.user
    const projectId = params.projectId
    const perms = await authUser(user, { id: projectId })
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const lock = data.lock

    const body = await handleProjectLocking(projectId, lock)

    return {
      status: 200,
      body,
    }
  },
})
