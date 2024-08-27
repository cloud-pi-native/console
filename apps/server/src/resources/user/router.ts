import { AdminAuthorized, userContract } from '@cpn-console/shared'
import {
  getMatchingUsers,
  getUsers,
  logUser,
  patchUsers,
} from './business.js'
import '@/types/index.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { Forbidden403 } from '@/utils/errors.js'

export function userRouter() {
  return serverInstance.router(userContract, {
    getMatchingUsers: async ({ query }) => {
      const usersMatching = await getMatchingUsers(query)

      return {
        status: 200,
        body: usersMatching,
      }
    },

    auth: async ({ request }) => {
      const user = request.session.user
      const body = await logUser(user)

      return {
        status: 200,
        body,
      }
    },

    getAllUsers: async ({ request: req, query }) => {
      const requestor = req.session.user
      const perms = await authUser(requestor)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const body = await getUsers(query)

      return {
        status: 200,
        body,
      }
    },

    patchUsers: async ({ request: req, body }) => {
      const requestor = req.session.user
      const perms = await authUser(requestor)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const users = await patchUsers(body)

      return {
        status: 200,
        body: users,
      }
    },
  })
}
