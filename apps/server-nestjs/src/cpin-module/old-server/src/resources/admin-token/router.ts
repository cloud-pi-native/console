import { AdminAuthorized, adminTokenContract } from '@cpn-console/shared'
import { serverInstance } from '../../app.js'
import { createToken, deleteToken, listTokens } from './business.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403 } from '@/utils/errors.js'

export function adminTokenRouter() {
  return serverInstance.router(adminTokenContract, {
    listAdminTokens: async ({ request: req, query }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
      const body = await listTokens(query)

      return {
        status: 200,
        body,
      }
    },

    createAdminToken: async ({ request: req, body: data }) => {
      const perms = await authUser(req)

      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
      const body = await createToken(data)
      if (body instanceof ErrorResType) return body

      return {
        status: 201,
        body,
      }
    },

    deleteAdminToken: async ({ request: req, params }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
      await deleteToken(params.tokenId)

      return {
        status: 204,
        body: null,
      }
    },
  })
}
