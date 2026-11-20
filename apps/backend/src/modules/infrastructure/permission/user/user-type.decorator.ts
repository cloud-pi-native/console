import type { User } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

export const USER_TYPES_KEY = 'user-types'

export function RequireUserType(...types: User['type'][]) {
  return SetMetadata(USER_TYPES_KEY, types)
}
