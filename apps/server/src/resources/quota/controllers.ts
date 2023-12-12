import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getQuotas } from './business.js'
import { type RouteHandler } from 'fastify'
import { type FastifyRequestWithSession } from '@/types/index.js'

// GET
export const getQuotasController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const user = req.session?.user
  const quotas = await getQuotas(user)

  addReqLogs({
    req,
    description: 'Quotas récupérés avec succès',
  })
  sendOk(res, quotas)
}
