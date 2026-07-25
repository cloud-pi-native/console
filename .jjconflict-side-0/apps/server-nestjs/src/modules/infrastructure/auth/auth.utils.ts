import type { FastifyRequest } from 'fastify'
import type { UserContext } from './auth-user.decorator'

export interface AuthRequirements {
  includeAdminRoleIds?: boolean
  includeUserType?: boolean
}

export interface AuthProvider {
  authenticate: (
    request: FastifyRequest,
    requirements?: AuthRequirements,
  ) => Promise<UserContext | undefined>
}
