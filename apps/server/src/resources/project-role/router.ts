import { AdminAuthorized, ProjectAuthorized, projectRoleContract } from '@cpn-console/shared'
import {
  countRolesMembers,
  createRole,
  deleteRole,
  listRoles,
  patchRoles,
} from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403, NotFound404 } from '@/utils/errors.js'

export function projectRoleRouter() {
  return serverInstance.router(projectRoleContract, {
  // Récupérer des projets
    listProjectRoles: async ({ request: req, params }) => {
      const { projectId } = params
      const requestor = req.session.user
      const perms = await authUser(requestor, { id: projectId })
      if (!perms.projectPermissions && !AdminAuthorized.isAdmin(perms.adminPermissions)) return new NotFound404()

      const body = await listRoles(projectId)

      return {
        status: 200,
        body,
      }
    },

    createProjectRole: async ({ request: req, params: { projectId }, body }) => {
      const requestor = req.session.user
      const perms = await authUser(requestor, { id: projectId })
      if (!perms.projectPermissions && !AdminAuthorized.isAdmin(perms.adminPermissions)) return new NotFound404()
      if (!ProjectAuthorized.ManageRoles(perms)) return new Forbidden403()
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const resBody = await createRole(projectId, body)

      return {
        status: 201,
        body: resBody,
      }
    },

    patchProjectRoles: async ({ request: req, params: { projectId }, body }) => {
      const user = req.session.user
      const perms = await authUser(user, { id: projectId })

      if (!perms.projectPermissions) return new NotFound404()
      if (!ProjectAuthorized.ManageRoles(perms)) return new Forbidden403()
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const resBody = await patchRoles(projectId, body)
      if (resBody instanceof ErrorResType) return resBody

      return {
        status: 200,
        body: resBody,
      }
    },

    projectRoleMemberCounts: async ({ request: req, params }) => {
      const { projectId } = params
      const user = req.session.user
      const perms = await authUser(user, { id: projectId })
      if (!perms.projectPermissions && !AdminAuthorized.isAdmin(perms.adminPermissions)) return new NotFound404()

      const resBody = await countRolesMembers(projectId)

      return {
        status: 200,
        body: resBody,
      }
    },

    deleteProjectRole: async ({ request: req, params: { projectId, roleId } }) => {
      const user = req.session.user
      const perms = await authUser(user, { id: projectId })
      if (!perms.projectPermissions) return new NotFound404()
      if (!ProjectAuthorized.ManageRoles(perms)) return new Forbidden403()
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const resBody = await deleteRole(roleId)

      return {
        status: 200,
        body: resBody,
      }
    },
  })
}
