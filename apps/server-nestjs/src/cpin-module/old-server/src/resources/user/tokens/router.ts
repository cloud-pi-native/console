import { personalAccessTokenContract } from '@cpn-console/shared'

import '@/types/index.js'
import { createToken, deleteToken, listTokens } from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403 } from '@/utils/errors.js'

export function personalAccessTokenRouter() {
  return serverInstance.router(personalAccessTokenContract, {
    listPersonalAccessTokens: async ({ request: req }) => {
      const perms = await authUser(req)

      if (!perms.user?.id || perms.user?.type !== 'human') return new Forbidden403()
      const body = await listTokens(perms.user.id)

      return {
        status: 200,
        body,
      }
    },

    createPersonalAccessToken: async ({ request: req, body: data }) => {
      const perms = await authUser(req)

      if (!perms.user?.id || perms.user?.type !== 'human') return new Forbidden403()
      const body = await createToken(data, perms.user.id)
      if (body instanceof ErrorResType) return body

      return {
        status: 201,
        body,
      }
    },

    deletePersonalAccessToken: async ({ request: req, params }) => {
      const perms = await authUser(req)

      if (!perms.user?.id || perms.user?.type !== 'human') return new Forbidden403()
      await deleteToken(params.tokenId, perms.user.id)

      return {
        status: 204,
        body: null,
      }
    },
  })
}
