import { addReqLogs } from '@/utils/logger.js'
import {
  getActiveOrganizations,
} from './business.js'
import { serverInstance } from '@/app.js'
import { organizationContract } from '@cpn-console/shared'

export const organizationRouter = () => serverInstance.router(organizationContract, {
  getOrganizations: async ({ request: req }) => {
    const requestor = req.session.user
    // @ts-ignore
    delete requestor.groups

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
