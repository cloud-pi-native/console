import { AdminAuthorized, userContract } from '@cpn-console/shared'
import {
  getMatchingUsers,
  getUsers,
  logViaSession,
  patchUsers,
} from './business.js'
import '@/types/index'
import { serverInstance } from '@/app'
import { authUser } from '@/utils/controller'
import { ErrorResType, Forbidden403, Unauthorized401 } from '@/utils/errors'

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

    getAllUsers: async ({ request: req, query: { relationType, ...query } }) => {
      const perms = await authUser(req)

      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const body = await getUsers(query, relationType)
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
