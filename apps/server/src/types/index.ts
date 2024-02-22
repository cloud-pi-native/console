import type { Cluster } from '@prisma/client'
import type { ClusterModel } from '@cpn-console/shared'

export type UserDetails = {
  id: string
  firstName: string
  lastName: string
  email: string
  groups: string[]
}

export type ClusterMix = Cluster & ClusterModel

declare module 'fastify' {
  interface Session {
    user: UserDetails
  }
}
