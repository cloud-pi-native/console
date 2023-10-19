import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getQuotas } from './business.js'

// GET
export const getQuotasController = async (req, res) => {
  const userId = req.session?.user?.id
  const quotas = await getQuotas(userId)

  addReqLogs({
    req,
    description: 'Quotas récupérés avec succès',
  })
  sendOk(res, quotas)
}
