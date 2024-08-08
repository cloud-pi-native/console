export type ErrorTypes = 'info' | 'warning' | 'error' | 'success'

export type UserProfile = {
  email: string
  id: string
  firstName: string
  lastName: string
  groups: string[]
}

export type ResourceById<T extends { id: string }> = Record<T['id'], T>

export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }

export type XOR<T, U> =
  T extends object ?
    U extends object ?
    (Without<T, U> & U) | (Without<U, T> & T)
      : U : T
