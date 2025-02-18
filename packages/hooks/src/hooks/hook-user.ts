import { type Hook, createHook } from './hook.js'
import type { UserObject } from './index.js'

export type UserEmail = Pick<UserObject, 'email'>
export type UserAdmin = Pick<UserObject, 'id'> & { isAdmin: boolean }
export const retrieveUserByEmail: Hook<UserEmail> = createHook()
