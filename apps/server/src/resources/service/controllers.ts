import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { checkServicesHealthBusiness } from './business.js'

export const checkServicesHealthController = async (req, res) => {
  const requestorId = req.session?.user?.id

  const serviceData = await checkServicesHealthBusiness(requestorId)
  addReqLogs({
    req,
    description: 'Etats des services récupérés avec succès',
  })
  sendOk(res, serviceData)
}
