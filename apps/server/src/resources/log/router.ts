import type { CleanLog, Log, XOR } from '@cpn-console/shared'
import type { UserProfile, UserProjectProfile } from '../../utils/controller.ts'
import { AdminAuthorized, logContract } from '@cpn-console/shared'
import { serverInstance } from '../../app.ts'
import { authUser } from '../../utils/controller.ts'
import { Forbidden403 } from '../../utils/errors.ts'
import { getLogs } from './business.ts'

export function logRouter() {
  return serverInstance.router(logContract, {
  // Récupérer des logs
    getLogs: async ({ request: req, query }) => {
      const perms: XOR<UserProfile, UserProjectProfile> = query.projectId
        ? await authUser(req, { id: query.projectId })
        : await authUser(req)

      if (!AdminAuthorized.ListSystem(perms.adminPermissions)) {
        if (!perms.projectPermissions) return new Forbidden403()
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
