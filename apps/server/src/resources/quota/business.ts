import { UnauthorizedError } from '@/utils/errors.js'
import {
  getUserById,
  getQuotas as getQuotasQuery,
} from '../queries-index.js'
import { User } from '@prisma/client'

export const getQuotas = async (userId: User['id']) => {
  const user = await getUserById(userId)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')
  return getQuotasQuery()
}
