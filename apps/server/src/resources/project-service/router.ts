import { AdminAuthorized, ProjectAuthorized, projectServiceContract } from '@cpn-console/shared'
import { getProjectServices, updateProjectServices } from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { Forbidden403, NotFound404 } from '@/utils/errors.js'

export function projectServiceRouter() {
  return serverInstance.router(projectServiceContract, {
  // Récupérer les services d'un projet
    getServices: async ({ request: req, params: { projectId }, query }) => {
      const perms = await authUser(req, { id: projectId })
      if (!perms.projectPermissions && !AdminAuthorized.ManageProjects(perms.adminPermissions)) return new NotFound404()
      if (!AdminAuthorized.ManageProjects(perms.adminPermissions) && query.permissionTarget === 'admin') return new Forbidden403('Vous ne pouvez pas demander les paramètres admin')

      const body = await getProjectServices(projectId, query.permissionTarget)

      return {
        status: 200,
        body,
      }
    },

    updateProjectServices: async ({ request: req, params: { projectId }, body }) => {
      const perms = await authUser(req, { id: projectId })
      if (!ProjectAuthorized.Manage(perms)) return new NotFound404()
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')

      const allowedRoles: Array<'user' | 'admin'> = AdminAuthorized.ManageProjects(perms.adminPermissions) ? ['user', 'admin'] : ['user']

      const resBody = await updateProjectServices(projectId, body, allowedRoles)
      return {
        status: 204,
        body: resBody,
      }
    },
  })
}
