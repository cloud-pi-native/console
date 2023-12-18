import type { User } from '@prisma/client'
import type { ProjectBase } from './project.js'
import { type Hook, createHook } from './hook.js'

export type AddUserToProjectValidateArgs = ProjectBase & { user: User }
export type AddUserToProjectExecArgs = ProjectBase & { user: User }
export type UpdateUserProjectRoleValidateArgs = void
export type UpdateUserProjectRoleExecArgs = void
export type RemoveUserFromProjectValidateArgs = ProjectBase & { user: User }
export type RemoveUserFromProjectExecArgs = ProjectBase & { user: User }
export type RetrieveUserByEmailArgs = Pick<User, 'email'>

export const retrieveUserByEmail: Hook<RetrieveUserByEmailArgs, RetrieveUserByEmailArgs> = createHook()
export const addUserToProject: Hook<AddUserToProjectExecArgs, AddUserToProjectValidateArgs> = createHook()
export const updateUserProjectRole: Hook<UpdateUserProjectRoleExecArgs, UpdateUserProjectRoleValidateArgs> = createHook()
export const removeUserFromProject: Hook<RemoveUserFromProjectExecArgs, RemoveUserFromProjectValidateArgs> = createHook()
