import type { Log } from '@cpn-console/shared'
import type { Log as LogModel } from '@prisma/client'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { Forbidden403 } from '@/utils/errors.js'
import { AdminAuthorized, logContract } from '@cpn-console/shared'
import { getLogs } from './business.js'

export function logRouter() {
  return serverInstance.router(logContract, {
  // Récupérer des logs
    getLogs: async ({ request: req, query }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const [total, logs] = await getLogs(query) as [number, unknown[]] as [number, Array<LogModel & { data: Log['data'] }>]

      return {
        status: 200,
        body: { total, logs },
      }
    },
  })
}
