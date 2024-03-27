import { userAdminContract } from '@cpn-console/shared'
import { addReqLogs } from '@/utils/logger.js'
import { getUsers } from './business.js'
import { serverInstance } from '@/app.js'

export const userAdminRouter = () => serverInstance.router(userAdminContract, {
  getAllUsers: async ({ request: req }) => {
    try {
      const users = await getUsers()

      addReqLogs({
        req,
        message: 'Ensemble des utilisateurs récupérés avec succès',
      })
      return {
        status: 200,
        body: users,
      }
    } catch (error) {
      throw new Error(error.message)
    }
  },
})
