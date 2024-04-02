import { addReqLogs } from '@/utils/logger.js'
import { getQuotas } from './business.js'
import { quotaContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export const quotaRouter = () => serverInstance.router(quotaContract, {

  // Récupérer les quotas disponibles
  getQuotas: async ({ request: req }) => {
    const user = req.session.user
    const quotas = await getQuotas(user)

    addReqLogs({
      req,
      message: 'Quotas récupérés avec succès',
    })
    return {
      status: 200,
      body: quotas,
    }
  },
})
