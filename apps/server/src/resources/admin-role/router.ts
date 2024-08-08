import {
  countRolesMembers,
  createRole,
  deleteRole,
  listRoles,
  patchRoles,
} from './business.js'
import { AdminAuthorized, adminRoleContract, ProjectAuthorized } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { authUser, Forbidden403, ErrorResType } from '@/utils/controller.js'

export const adminRoleRouter = () => serverInstance.router(adminRoleContract, {
  // Récupérer des projets
  listAdminRoles: async () => {
    const body = await listRoles()

    return {
      status: 200,
      body,
    }
  },

  createAdminRole: async ({ request: req, body }) => {
    const requestor = req.session.user
    const perms = await authUser(requestor)
    if (!ProjectAuthorized.ManageRoles(perms)) return new Forbidden403()

    const resBody = await createRole(body)

    return {
      status: 201,
      body: resBody,
    }
  },

  patchAdminRoles: async ({ request: req, body }) => {
    const requestor = req.session.user
    const perms = await authUser(requestor)
    if (!ProjectAuthorized.ManageRoles(perms)) return new Forbidden403()

    const resBody = await patchRoles(body)
    if (resBody instanceof ErrorResType) return resBody

    return {
      status: 200,
      body: resBody,
    }
  },

  adminRoleMemberCounts: async ({ request: req }) => {
    const requestor = req.session.user
    const perms = await authUser(requestor)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

    const resBody = await countRolesMembers()

    return {
      status: 200,
      body: resBody,
    }
  },

  deleteAdminRole: async ({ request: req, params }) => {
    const requestor = req.session.user
    const perms = await authUser(requestor)
    if (!ProjectAuthorized.ManageRoles(perms)) return new Forbidden403()

    const resBody = await deleteRole(params.roleId)

    return {
      status: 204,
      body: resBody,
    }
  },
})