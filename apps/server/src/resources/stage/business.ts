import { UnauthorizedError } from '@/utils/errors.js'
import {
  getUserById,
  getStages as getStagesQuery,
} from '../queries-index.js'
import { User } from '@prisma/client'

export const getStages = async (userId: User['id']) => {
  const user = await getUserById(userId)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')
  return getStagesQuery()
}
