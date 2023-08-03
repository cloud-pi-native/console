import { UserModel } from 'shared'
import type { ProjectBase } from './project.js'
import { type Hook, createHook } from './hook.js'

export type AddUserToProjectValidateArgs = ProjectBase & { user: UserModel }
export type AddUserToProjectExecArgs = ProjectBase & { user: UserModel }
export type UpdateUserProjectRoleValidateArgs = void
export type UpdateUserProjectRoleExecArgs = void
export type RemoveUserFromProjectValidateArgs = ProjectBase & { user: UserModel }
export type RemoveUserFromProjectExecArgs = ProjectBase & { user: UserModel }
export type RetrieveUserByEmailArgs = Pick<UserModel, 'email'>

export const retrieveUserByEmail: Hook<RetrieveUserByEmailArgs, RetrieveUserByEmailArgs> = createHook()
export const addUserToProject: Hook<AddUserToProjectExecArgs, AddUserToProjectValidateArgs> = createHook()
export const updateUserProjectRole: Hook<UpdateUserProjectRoleExecArgs, UpdateUserProjectRoleValidateArgs> = createHook()
export const removeUserFromProject: Hook<RemoveUserFromProjectExecArgs, RemoveUserFromProjectValidateArgs> = createHook()
