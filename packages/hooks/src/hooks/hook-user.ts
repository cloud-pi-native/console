import { type Hook, createHook } from './hook'
import type { UserObject } from './index'

export type UserEmail = Pick<UserObject, 'email'>
export type UserAdmin = Pick<UserObject, 'id'> & { isAdmin: boolean }
export const retrieveUserByEmail: Hook<UserEmail> = createHook()
