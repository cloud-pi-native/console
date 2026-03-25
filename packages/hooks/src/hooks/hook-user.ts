import type { Hook } from './hook.ts'
import type { UserObject } from './index.ts'
import { createHook } from './hook.ts'

export type UserEmail = Pick<UserObject, 'email'>
export type UserAdmin = Pick<UserObject, 'id'> & { isAdmin: boolean }
export const retrieveUserByEmail: Hook<UserEmail> = createHook()
