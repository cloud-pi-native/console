import type { EmptyPayload, UserObject } from './index.js'
import { createHook, type Hook } from './hook.js'

export type UserEmail = Pick<UserObject, 'email'>
export type UserAdmin = Pick<UserObject, 'id'> & { isAdmin: boolean }
export const retrieveUserByEmail: Hook<UserEmail, UserEmail> = createHook()
export const retrieveAdminUsers: Hook<EmptyPayload, EmptyPayload> = createHook()
export const updateUserAdminGroupMembership: Hook<UserAdmin, UserAdmin> = createHook()
