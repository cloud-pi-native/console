import type { User } from '@cpn-console/shared'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const repeatFn = (nb: number) => (fn: (optionalParam?: any) => any, optionalParam?: any) => Array.from({ length: nb }).map(() => fn(optionalParam))

// transform an array of UserModel in object-like usersStore
export const toUsersStore = (users: Array<Required<User>>): Record<string, Required<User>> => users.reduce((store, user) => ({ ...store, [user.id]: user }), {})
