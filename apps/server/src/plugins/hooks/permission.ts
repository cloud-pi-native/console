import { type Hook, createHook } from './hook.js'

export type SetPermissionValidateArgs = void
export type SetPermissionExecArgs = void
export type UpdatePermissionValidateArgs = void
export type UpdatePermissionExecArgs = void
export type DeletePermissionValidateArgs = void
export type DeletePermissionExecArgs = void

export const setPermission: Hook<SetPermissionExecArgs, SetPermissionValidateArgs> = createHook()
export const updatePermission: Hook<UpdatePermissionExecArgs, UpdatePermissionValidateArgs> = createHook()
export const deletePermission: Hook<DeletePermissionExecArgs, DeletePermissionValidateArgs> = createHook()
