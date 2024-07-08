import { userAdminContract } from '@cpn-console/shared'
import { addReqLogs } from '@/utils/logger.js'
import { serverInstance } from '@/app.js'
import { getUsers, updateUserAdminRole as updateUserAdminRoleBusiness } from '../business.js'

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

  updateUserAdminRole: async ({ request: req, params, body }) => {
    try {
      const userId = params.userId
      const isAdmin = body.isAdmin

      await updateUserAdminRoleBusiness({ userId, isAdmin }, req.id)

      addReqLogs({
        req,
        message: 'Rôle administrateur de l\'utilisateur mis à jour avec succès',
      })
      return {
        status: 204,
        body: null,
      }
    } catch (error) {
      throw new Error(error.message)
    }
  },
})
