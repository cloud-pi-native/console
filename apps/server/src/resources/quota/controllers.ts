import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getQuotas } from './business.js'

// GET
export const getQuotasController = async (req, res) => {
  const user = req.session?.user
  const quotas = await getQuotas(user)

  addReqLogs({
    req,
    description: 'Quotas récupérés avec succès',
  })
  sendOk(res, quotas)
}
