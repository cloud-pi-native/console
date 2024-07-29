import { AdminAuthorized, ProjectAuthorized, projectServiceContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { getProjectServices, updateProjectServices } from './business.js'
import { authUser, Forbidden403, NotFound404 } from '@/utils/controller.js'

export const projectServiceRouter = () => serverInstance.router(projectServiceContract, {
  // Récupérer les services d'un projet
  getServices: async ({ request: req, params: { projectId } }) => {
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    if (!perms.projectPermissions && !AdminAuthorized.isAdmin(perms.adminPermissions)) return new NotFound404()

    const body = await getProjectServices(projectId, AdminAuthorized.isAdmin(perms.adminPermissions) ? 'admin' : 'user')

    return {
      status: 200,
      body,
    }
  },

  updateProjectServices: async ({ request: req, params: { projectId }, body }) => {
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    if (!ProjectAuthorized.Manage(perms)) return new NotFound404()
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const allowedRoles: Array<'user' | 'admin'> = AdminAuthorized.isAdmin(perms.adminPermissions) ? ['user', 'admin'] : ['user']

    const resBody = await updateProjectServices(projectId, body, allowedRoles)
    return {
      status: 204,
      body: resBody,
    }
  },
})
