import { User } from '@cpn-console/shared'

export type UserDetails = {
  id: string
  firstName: string
  lastName: string
  email: string
  groups: string[]
  type: User['type'],
}

export interface Resources {
  cpu: number
  gpu: number
  memory: number
}

declare module 'fastify' {
  interface Session {
    user?: UserDetails
  }
}
