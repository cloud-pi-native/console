import { AdminAuthorized, zoneContract } from '@cpn-console/shared'
import { createZone, deleteZone, listZones, updateZone } from './business.js'
import { serverInstance } from '@/app.js'

import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403 } from '@/utils/errors.js'

export function zoneRouter() {
  return serverInstance.router(zoneContract, {
    listZones: async () => {
      const zones = await listZones()

      return {
        status: 200,
        body: zones,
      }
    },

    createZone: async ({ request: req, body: data }) => {
      const requestor = req.session.user
      const perms = await authUser(requestor)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const body = await createZone(data)
      if (body instanceof ErrorResType) return body

      return {
        status: 201,
        body,
      }
    },

    updateZone: async ({ request: req, params, body: data }) => {
      const requestor = req.session.user
      const perms = await authUser(requestor)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const zoneId = params.zoneId

      const body = await updateZone(zoneId, data)
      if (body instanceof ErrorResType) return body

      return {
        status: 200,
        body,
      }
    },

    deleteZone: async ({ request: req, params }) => {
      const requestor = req.session.user
      const perms = await authUser(requestor)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
      const zoneId = params.zoneId

      const body = await deleteZone(zoneId)
      if (body instanceof ErrorResType) return body

      return {
        status: 204,
        body,
      }
    },
  })
}
