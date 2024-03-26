import type { FastifyRequest } from 'fastify'
import { User } from '@prisma/client'
import { adminGroupPath } from '@cpn-console/shared'
import { addReqLogs } from '@/utils/logger.js'
import { getUserById } from '../queries-index.js'

interface ErrorResponse {
  status: 401
  body: {
    message: string
    error: Error
  }
}

interface SuccessResponse {
  success: true
  user: User
  response?: never
}

interface FailureResponse {
  success: false
  response: ErrorResponse
  user?: never
}

type CheckUserExistsResponse = SuccessResponse | FailureResponse
type checkUserIsAdmin = { success: true } | FailureResponse

export const checkUserExists = async (req: FastifyRequest): Promise<CheckUserExistsResponse> => {
  const user = await getUserById(req.session.user.id)
  if (!user) {
    const error = new Error('Vous n\'êtes pas connecté')
    addReqLogs({ req, message: 'Erreur de récupération des clusters', error, infos: { keycloakUserId: req.session.user.id } })
    const errorResponse: ErrorResponse = {
      status: 401,
      body: {
        message: error.message,
        error,
      },
    }
    return { success: false, response: errorResponse }
  }
  return { success: true, user }
}

export const checkUserIsAdmin = (req: FastifyRequest, requestorId: string): checkUserIsAdmin => {
  if (!req.session.user.groups?.includes(adminGroupPath)) {
    const error = new Error('Vous n\'avez pas les droits administrateur')
    addReqLogs({ req, message: 'Erreur de récupération des clusters', error, infos: { userId: requestorId } })
    return {
      success: false,
      response: {
        status: 401,
        body: {
          message: error.message,
          error,
        },
      },
    }
  }
  return { success: true }
}
