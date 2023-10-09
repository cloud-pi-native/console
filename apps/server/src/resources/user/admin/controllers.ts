import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import { getUsers } from './business.js'

export const getUsersController = async (req, res) => {
  const users = await getUsers()

  addReqLogs({
    req,
    description: 'Ensemble des utilisateurs récupérés avec succès',
  })
  sendOk(res, users)
}
