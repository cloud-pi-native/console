export type UserDetails = {
  id: string
  firstName: string
  lastName: string
  email: string
  groups: string[]
}

declare module 'fastify' {
  interface Session {
    user: UserDetails
  }
}
