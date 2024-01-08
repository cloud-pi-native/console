import type { Cluster } from '@prisma/client'
import type { ClusterModel } from '@dso-console/shared'

export type UserDetails = {
  id: string
  firstName: string
  lastName: string
  email: string
  groups: string[]
}

export type ClusterMix = Omit<Cluster & ClusterModel, 'createdAt' | 'updatedAt'>

declare module 'fastify' {
  interface Session{
    user: UserDetails
  }
}
