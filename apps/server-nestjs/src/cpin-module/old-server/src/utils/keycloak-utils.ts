import { tokenHeaderName } from '@cpn-console/shared'
import type { FastifyRequest } from 'fastify'

interface KeycloakPayload {
  sub: string
  email: string
  given_name: string
  family_name: string
  groups: string[]
}

export function userPayloadMapper(userPayload: KeycloakPayload) {
  return {
    id: userPayload.sub,
    email: userPayload.email,
    firstName: userPayload.given_name,
    lastName: userPayload.family_name,
    groups: userPayload.groups || [],
  }
}

export function bypassFn(request: FastifyRequest) {
  try {
    return !!request.headers[tokenHeaderName]
  } catch (_e) {}
  return false
}
