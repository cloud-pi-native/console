import type { Cluster } from '@prisma/client'
import type { ClusterModel } from '@dso-console/shared'

export type UserDetails = {
  id: string
  firstName: string
  lastName: string
  email: string
  groups: string[]
}

export type ClusterMix = Cluster & ClusterModel

declare module 'fastify' {
  interface Session{
    user: UserDetails
  }
}
