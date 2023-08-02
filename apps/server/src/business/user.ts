import { getOrCreateUser } from '@/queries/index.js'
import { User } from '@prisma/client'

export type UserDto = Pick<User, 'email' | 'firstName' | 'lastName' | 'id'>
export const getUser = async (user: UserDto) => {
  return getOrCreateUser(user)
}
