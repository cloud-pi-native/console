import type { CleanLog, Log } from '@cpn-console/shared'
import { AdminAuthorized, ProjectAuthorized, logContract } from '@cpn-console/shared'
import { getLogs } from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { Forbidden403 } from '@/utils/errors.js'

export function logRouter() {
  return serverInstance.router(logContract, {
  // Récupérer des logs
    getLogs: async ({ request: req, query }) => {
      const perms = query.projectId
        ? await authUser(req, { id: query.projectId })
        : await authUser(req)

      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) {
        if (!ProjectAuthorized.Manage(perms)) {
          return new Forbidden403()
        }
        query.clean = true
      }

      const [total, logs] = await getLogs(query) as [number, unknown[]] as [number, Array<Log | CleanLog & { data: Log['data'] }>]

      return {
        status: 200,
        body: { total, logs },
      }
    },
  })
}
