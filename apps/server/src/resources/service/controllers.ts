import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { checkServicesHealth } from './business.js'

export const checkServicesHealthController = async (req, res) => {
  const requestor = req.session?.user
  const isAdmin = requestor.groups.includes('/admin')
  delete requestor.groups

  const serviceData = await checkServicesHealth(requestor, isAdmin)
  addReqLogs({
    req,
    description: 'Etats des services récupérés avec succès',
  })
  sendOk(res, serviceData)
}
