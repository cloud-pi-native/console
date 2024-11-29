import { AdminAuthorized, userContract } from '@cpn-console/shared'
import {
  getMatchingUsers,
  getUser,
  listUsers,
  logViaSession,
  patchUsers,
} from './business.js'
import '@/types/index.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403, Unauthorized401 } from '@/utils/errors.js'

export function userRouter() {
  return serverInstance.router(userContract, {
    getMatchingUsers: async ({ query }) => {
      const usersMatching = await getMatchingUsers(query)

      return {
        status: 200,
        body: usersMatching,
      }
    },

    auth: async ({ request: req }) => {
      const user = req.session.user

      if (!user) return new Unauthorized401()

      const { user: body } = await logViaSession(user)

      return {
        status: 200,
        body,
      }
    },

    getUser: async ({ request: req, params }) => {
      const perms = await authUser(req)

      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const body = await getUser(params.id)
      if (body instanceof ErrorResType) return body

      return {
        status: 200,
        body,
      }
    },

    listUsers: async ({ request: req, query }) => {
      const perms = await authUser(req)

      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const body = await listUsers(query)
      if (body instanceof ErrorResType) return body

      return {
        status: 200,
        body,
      }
    },

    patchUsers: async ({ request: req, body }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const users = await patchUsers(body)

      return {
        status: 200,
        body: users,
      }
    },
  })
}
