import type { ProjectBase } from './project.js'
import { type Hook, createHook } from './hook.js'
import type { UserObject } from './index.js'

export type AddUserToProjectValidateArgs = ProjectBase & { user: UserObject }
export type AddUserToProjectExecArgs = ProjectBase & { user: UserObject }
export type UpdateUserProjectRoleValidateArgs = Record<string, never>
export type UpdateUserProjectRoleExecArgs = Record<string, never>
export type RemoveUserFromProjectValidateArgs = ProjectBase & { user: UserObject }
export type RemoveUserFromProjectExecArgs = ProjectBase & { user: UserObject }
export type RetrieveUserByEmailArgs = Pick<UserObject, 'email'>

export const retrieveUserByEmail: Hook<RetrieveUserByEmailArgs, RetrieveUserByEmailArgs> = createHook()
export const addUserToProject: Hook<AddUserToProjectExecArgs, AddUserToProjectValidateArgs> = createHook()
export const updateUserProjectRole: Hook<UpdateUserProjectRoleExecArgs, UpdateUserProjectRoleValidateArgs> = createHook()
export const removeUserFromProject: Hook<RemoveUserFromProjectExecArgs, RemoveUserFromProjectValidateArgs> = createHook()
