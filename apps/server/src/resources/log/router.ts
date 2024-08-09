import { getLogs } from './business.js'
import { serverInstance } from '@/app.js'
import { AdminAuthorized, Log, logContract } from '@cpn-console/shared'
import { Log as LogModel } from '@prisma/client'
import { authUser } from '@/utils/controller.js'
import { Forbidden403 } from '@/utils/errors.js'

export const logRouter = () => serverInstance.router(logContract, {
  // Récupérer des logs
  getLogs: async ({ request: req, query }) => {
    const requestor = req.session.user
    const perms = await authUser(requestor)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

    const [total, logs] = await getLogs(query) as [number, unknown[]] as [number, Array<LogModel & { data: Log['data'] }>]

    return {
      status: 200,
      body: { total, logs },
    }
  },
})
