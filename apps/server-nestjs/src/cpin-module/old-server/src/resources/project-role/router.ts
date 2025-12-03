import { AdminAuthorized, ProjectAuthorized, projectRoleContract } from '@cpn-console/shared'
import {
  countRolesMembers,
  createRole,
  deleteRole,
  listRoles,
  patchRoles,
} from './business.js'
import { serverInstance } from '@old-server/app.js'
import { authUser } from '@old-server/utils/controller.js'
import { ErrorResType, Forbidden403, NotFound404 } from '@old-server/utils/errors.js'

export function projectRoleRouter() {
  return serverInstance.router(projectRoleContract, {
  // Récupérer des projets
    listProjectRoles: async ({ request: req, params }) => {
      const { projectId } = params
      const perms = await authUser(req, { id: projectId })
      if (!perms.projectPermissions && !AdminAuthorized.isAdmin(perms.adminPermissions)) return new NotFound404()

      const body = await listRoles(projectId)

      return {
        status: 200,
        body,
      }
    },

    createProjectRole: async ({ request: req, params: { projectId }, body }) => {
      const perms = await authUser(req, { id: projectId })

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
      const perms = await authUser(req, { id: projectId })

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
      const perms = await authUser(req, { id: projectId })
      if (!perms.projectPermissions && !AdminAuthorized.isAdmin(perms.adminPermissions)) return new NotFound404()

      const resBody = await countRolesMembers(projectId)

      return {
        status: 200,
        body: resBody,
      }
    },

    deleteProjectRole: async ({ request: req, params: { projectId, roleId } }) => {
      const perms = await authUser(req, { id: projectId })
      if (!perms.projectPermissions) return new NotFound404()
      if (!ProjectAuthorized.ManageRoles(perms)) return new Forbidden403()
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const resBody = await deleteRole(roleId)

      return {
        status: 204,
        body: resBody,
      }
    },
  })
}
