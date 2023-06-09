import { type Hook, createHook } from './hook.js'

export type AddUserToProjectValidateArgs = void
export type AddUserToProjectExecArgs = void
export type UpdateUserProjectRoleValidateArgs = void
export type UpdateUserProjectRoleExecArgs = void
export type RemoveUserFromProjectValidateArgs = void
export type RemoveUserFromProjectExecArgs = void

export const addUserToProject: Hook<AddUserToProjectExecArgs, AddUserToProjectValidateArgs> = createHook()
export const updateUserProjectRole: Hook<UpdateUserProjectRoleExecArgs, UpdateUserProjectRoleValidateArgs> = createHook()
export const removeUserFromProject: Hook<RemoveUserFromProjectExecArgs, RemoveUserFromProjectValidateArgs> = createHook()
