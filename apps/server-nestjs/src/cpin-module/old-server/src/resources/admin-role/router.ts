import { AdminAuthorized, adminRoleContract } from '@cpn-console/shared'
import {
  countRolesMembers,
  createRole,
  deleteRole,
  listRoles,
  patchRoles,
} from './business'
import { serverInstance } from '@old-server/app'
import { authUser } from '@old-server/utils/controller'
import { ErrorResType, Forbidden403 } from '@old-server/utils/errors'

export function adminRoleRouter() {
  return serverInstance.router(adminRoleContract, {
  // Récupérer des projets
    listAdminRoles: async () => {
      const body = await listRoles()

      return {
        status: 200,
        body,
      }
    },

    createAdminRole: async ({ request: req, body }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const resBody = await createRole(body)

      return {
        status: 201,
        body: resBody,
      }
    },

    patchAdminRoles: async ({ request: req, body }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const resBody = await patchRoles(body)
      if (resBody instanceof ErrorResType) return resBody

      return {
        status: 200,
        body: resBody,
      }
    },

    adminRoleMemberCounts: async ({ request: req }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const resBody = await countRolesMembers()

      return {
        status: 200,
        body: resBody,
      }
    },

    deleteAdminRole: async ({ request: req, params }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const resBody = await deleteRole(params.roleId)

      return {
        status: 204,
        body: resBody,
      }
    },
  })
}
