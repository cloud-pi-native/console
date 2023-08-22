import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import {
  getActiveOrganizations,
} from './business.js'
import { EnhancedFastifyRequest } from '@/types/index.js'

// GET
export const getActiveOrganizationsController = async (req: EnhancedFastifyRequest<void>, res) => {
  const requestor = req.session?.user
  delete requestor.groups

  const organizations = await getActiveOrganizations(requestor)
  addReqLogs({
    req,
    description: 'Organisations récupérées avec succès',
  })
  sendOk(res, organizations)
}
