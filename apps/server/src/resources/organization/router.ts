import { organizationContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { addReqLogs } from '@/utils/logger.js'
import {
  getActiveOrganizations,
} from './business.js'

export const organizationRouter = () => serverInstance.router(organizationContract, {
  getOrganizations: async ({ request: req }) => {
    const requestor = req.session.user

    const organizations = await getActiveOrganizations(requestor)

    addReqLogs({
      req,
      message: 'Organisations récupérées avec succès',
    })
    return {
      status: 200,
      body: organizations,
    }
  },
})
