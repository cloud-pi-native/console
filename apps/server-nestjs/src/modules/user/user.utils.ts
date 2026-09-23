import type { AllUsers } from '@cpn-console/shared'
import type { User } from '@prisma/client'

export function toContractUser(user: User): AllUsers[number] {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    adminRoleIds: user.adminRoleIds,
    type: user.type,
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}
