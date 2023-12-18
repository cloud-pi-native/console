import type { Cluster } from '@prisma/client'
import type { FastifyRequest } from 'fastify/types/request'
import type { SensitiveClusterModel } from '@dso-console/shared'

export type KeycloakSession = {
  session?: {
    user?: {
      id: string
      firstName: string
      lastName: string
      email: string
      groups: string[]
    }
  }
}
export type FastifyRequestWithSession<T> = FastifyRequest<T> & KeycloakSession

export type ClusterMix = Cluster & SensitiveClusterModel
